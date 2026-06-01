from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import Optional, Dict, Any
import httpx
import os
import logging
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.modules.savings.auto_deposit import apply_auto_deposit_rules

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

# Definición de herramientas (Tools) para Gemini
FUNCTIONS_SCHEMA = [
    {
        "name": "get_financial_summary",
        "description": "Obtiene un resumen financiero completo del usuario, incluyendo el saldo total de sus cuentas bancarias, sus presupuestos del mes y sus metas de ahorro activas.",
        "parameters": {
            "type": "OBJECT",
            "properties": {}
        }
    },
    {
        "name": "create_transaction",
        "description": "Registra una nueva transacción (gasto o ingreso) en la cuenta del usuario. Los gastos deben tener un monto negativo, y los ingresos un monto positivo.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "amount": {
                    "type": "NUMBER",
                    "description": "Monto de la transacción. IMPORTANTE: Debe ser NEGATIVO para gastos (ej. -1500) y POSITIVO para ingresos (ej. 50000)."
                },
                "description": {
                    "type": "STRING",
                    "description": "Descripción, concepto o comercio de la transacción (ej. 'Café con medialunas', 'Sueldo de Mayo', 'Supermercado Coto')."
                },
                "category_name": {
                    "type": "STRING",
                    "description": "Nombre de la categoría (ej. 'Comida', 'Transporte', 'Servicios', 'Sueldo', 'Entretenimiento'). Si la categoría no existe, se creará automáticamente."
                },
                "account_name": {
                    "type": "STRING",
                    "description": "Nombre exacto de la cuenta del usuario donde se realiza el movimiento (ej. 'Mercado Pago', 'Efectivo'). IMPORTANTE: Si el usuario no especificó explícitamente qué cuenta utilizar en su mensaje original, NUNCA asumas una por defecto ni intentes adivinarla. En su lugar, debes responderle al usuario en texto consultándole de qué cuenta desea hacer el movimiento."
                },
                "transaction_date": {
                    "type": "STRING",
                    "description": "Fecha del movimiento en formato YYYY-MM-DD. Si no se provee, se usará la fecha actual."
                }
            },
            "required": ["amount", "description", "category_name", "account_name"]
        }
    },
    {
        "name": "create_saving_goal",
        "description": "Crea una nueva meta de ahorro para el usuario.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "name": {
                    "type": "STRING",
                    "description": "Nombre de la meta de ahorro (ej. 'Viaje a Brasil', 'Comprar Notebook', 'Fondo de Emergencia')."
                },
                "target_amount": {
                    "type": "NUMBER",
                    "description": "El monto total que se quiere ahorrar para esta meta."
                },
                "deadline": {
                    "type": "STRING",
                    "description": "Fecha límite para cumplir la meta en formato YYYY-MM-DD. Opcional."
                }
            },
            "required": ["name", "target_amount"]
        }
    },
    {
        "name": "create_budget",
        "description": "Crea o actualiza un presupuesto mensual límite para una categoría específica.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "category_name": {
                    "type": "STRING",
                    "description": "Nombre de la categoría a la cual asignarle presupuesto (ej. 'Comida', 'Transporte')."
                },
                "amount": {
                    "type": "NUMBER",
                    "description": "Monto máximo presupuestado para gastar mensualmente en esta categoría."
                }
            },
            "required": ["category_name", "amount"]
        }
    }
]

# Funciones de ejecución en la base de datos (Backend Tools)
def execute_get_financial_summary(db: Session, user_id: str) -> Dict[str, Any]:
    # 1. Obtener cuentas y saldos
    accounts = db.query(models.Account).filter(models.Account.user_id == user_id).all()
    accounts_data = [
        {"id": a.id, "name": a.name, "type": a.type.value, "balance": float(a.balance), "currency": a.currency}
        for a in accounts
    ]
    total_balance = sum(a["balance"] for a in accounts_data)

    # 2. Obtener presupuestos y calcular lo gastado este mes
    budgets = db.query(models.Budget).filter(models.Budget.user_id == user_id).all()
    current_month = date.today().replace(day=1)
    
    # Calcular gastos por categoría del mes en curso
    spent_by_category = db.query(
        models.Transaction.category_id,
        func.sum(models.Transaction.amount).label("total")
    ).join(models.Account).filter(
        models.Account.user_id == user_id,
        models.Transaction.transaction_date >= current_month,
        models.Transaction.amount < 0
    ).group_by(models.Transaction.category_id).all()
    
    spent_map = {item.category_id: abs(float(item.total)) for item in spent_by_category}

    budgets_data = []
    for b in budgets:
        spent = spent_map.get(b.category_id, 0.0)
        budgets_data.append({
            "id": b.id,
            "categoryName": b.category.name if b.category else "Desconocida",
            "limitAmount": float(b.amount),
            "spentAmount": spent,
            "remainingAmount": max(0.0, float(b.amount) - spent),
            "period": b.period.value
        })

    # 3. Metas de ahorro
    saving_goals = db.query(models.SavingGoal).filter(models.SavingGoal.user_id == user_id).all()
    goals_data = [
        {
            "id": g.id,
            "name": g.name,
            "targetAmount": float(g.target_amount),
            "currentAmount": float(g.current_amount),
            "deadline": str(g.deadline) if g.deadline else None,
            "progress": float(g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0
        }
        for g in saving_goals
    ]

    return {
        "status": "success",
        "currency": "USD",
        "totalBalance": total_balance,
        "accounts": accounts_data,
        "budgets": budgets_data,
        "savingGoals": goals_data,
        "todayDate": str(date.today())
    }

def execute_create_transaction(db: Session, user_id: str, amount: float, description: str, category_name: str, account_name: str, transaction_date: Optional[str] = None) -> Dict[str, Any]:
    # 1. Validar o buscar cuenta — lockeada para evitar race con otros endpoints.
    account = db.query(models.Account).filter(
        models.Account.user_id == user_id,
        models.Account.name.ilike(f"%{account_name}%")
    ).with_for_update().first()
    
    if not account_name or not account_name.strip():
        return {
            "status": "error_needs_account",
            "message": "No se especificó la cuenta. Preguntale al usuario de qué cuenta desea realizar el movimiento antes de registrar la transacción."
        }

    if not account:
        accounts_available = db.query(models.Account).filter(models.Account.user_id == user_id).all()
        if not accounts_available:
            return {"status": "error", "message": "El usuario no posee cuentas registradas. Primero debe crear una cuenta."}
        account_names = ", ".join(f"'{a.name}'" for a in accounts_available)
        return {
            "status": "error_account_not_found",
            "message": f"No se encontró ninguna cuenta con el nombre '{account_name}'. Las cuentas disponibles del usuario son: {account_names}. Consultale al usuario cuál desea usar."
        }

    # 2. Validar o buscar categoría
    # Solo categorías del usuario actual. `is_default` se setea por-usuario al registrarse,
    # así que filtrar por user_id es suficiente y evita cross-user category matching.
    category_type = models.CategoryType.EXPENSE if amount < 0 else models.CategoryType.INCOME
    category = db.query(models.Category).filter(
        models.Category.user_id == user_id,
        models.Category.name.ilike(category_name),
        models.Category.type == category_type
    ).first()

    if not category:
        # Crear la categoría dinámicamente si no existe
        # Asignar un color por defecto aleatorio/sutil
        colors = ["#10B981", "#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#6B7280"]
        import random
        color = random.choice(colors)
        
        category = models.Category(
            user_id=user_id,
            name=category_name.capitalize(),
            color=color,
            icon="HelpCircle", # Icono genérico
            type=category_type,
            is_default=False
        )
        db.add(category)
        db.flush() # Para obtener el ID
        logger.info(f"Categoría '{category_name}' creada dinámicamente.")

    # 3. Parsear fecha
    tx_date = date.today()
    if transaction_date:
        try:
            tx_date = datetime.strptime(transaction_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    # 4. Crear transacción
    new_tx = models.Transaction(
        account_id=account.id,
        category_id=category.id,
        amount=amount,
        description=description,
        transaction_date=tx_date,
        source="AI Chat"
    )
    db.add(new_tx)

    # Actualizar balance de la cuenta
    account.balance += amount

    # Auto-depósito en metas (#56): un ingreso por chat también debe disparar las reglas.
    # flush() para que new_tx.account resuelva antes de evaluar las reglas.
    db.flush()
    apply_auto_deposit_rules(db, new_tx)

    db.commit()
    db.refresh(new_tx)

    return {
        "status": "success",
        "message": f"Registrado con éxito: {'Gasto' if amount < 0 else 'Ingreso'} de {abs(amount)} en la categoría '{category.name}' (cuenta: '{account.name}')",
        "transaction": {
            "id": new_tx.id,
            "amount": float(new_tx.amount),
            "description": new_tx.description,
            "date": str(new_tx.transaction_date),
            "categoryName": category.name,
            "accountName": account.name,
            "type": category.type.value
        }
    }

def execute_create_saving_goal(db: Session, user_id: str, name: str, target_amount: float, deadline: Optional[str] = None) -> Dict[str, Any]:
    goal_date = None
    if deadline:
        try:
            goal_date = datetime.strptime(deadline, "%Y-%m-%d").date()
        except ValueError:
            pass

    new_goal = models.SavingGoal(
        user_id=user_id,
        name=name.capitalize(),
        target_amount=target_amount,
        current_amount=0,
        deadline=goal_date,
        icon="PiggyBank",
        color="#10B981"
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    return {
        "status": "success",
        "message": f"Meta de ahorro '{new_goal.name}' creada con un objetivo de {target_amount}.",
        "savingGoal": {
            "id": new_goal.id,
            "name": new_goal.name,
            "targetAmount": float(new_goal.target_amount),
            "currentAmount": float(new_goal.current_amount),
            "deadline": str(new_goal.deadline) if new_goal.deadline else None
        }
    }

def execute_create_budget(db: Session, user_id: str, category_name: str, amount: float) -> Dict[str, Any]:
    # Buscar categoría — solo las del user (las defaults también se crean por-usuario al registrarse).
    category = db.query(models.Category).filter(
        models.Category.user_id == user_id,
        models.Category.name.ilike(category_name),
        models.Category.type == models.CategoryType.EXPENSE
    ).first()

    if not category:
        # Crear la categoría de gasto
        category = models.Category(
            user_id=user_id,
            name=category_name.capitalize(),
            color="#3B82F6",
            icon="PieChart",
            type=models.CategoryType.EXPENSE,
            is_default=False
        )
        db.add(category)
        db.flush()

    # Buscar si ya existe presupuesto para esta categoría y periodo MONTHLY
    budget = db.query(models.Budget).filter(
        models.Budget.user_id == user_id,
        models.Budget.category_id == category.id,
        models.Budget.period == models.BudgetPeriod.MONTHLY
    ).first()

    if budget:
        budget.amount = amount
        message = f"Presupuesto de la categoría '{category.name}' actualizado a {amount} mensual."
    else:
        budget = models.Budget(
            user_id=user_id,
            category_id=category.id,
            amount=amount,
            period=models.BudgetPeriod.MONTHLY,
            start_date=date.today().replace(day=1)
        )
        db.add(budget)
        message = f"Presupuesto de {amount} mensual creado para la categoría '{category.name}'."

    db.commit()
    db.refresh(budget)

    return {
        "status": "success",
        "message": message,
        "budget": {
            "id": budget.id,
            "categoryName": category.name,
            "amount": float(budget.amount),
            "period": budget.period.value
        }
    }

def call_database_tool(name: str, args: Dict[str, Any], db: Session, user_id: str) -> Dict[str, Any]:
    try:
        if name == "get_financial_summary":
            return execute_get_financial_summary(db, user_id)
        elif name == "create_transaction":
            return execute_create_transaction(
                db, user_id,
                amount=float(args.get("amount", 0)),
                description=args.get("description", "Gasto chat"),
                category_name=args.get("category_name", "Otros"),
                account_name=args.get("account_name", ""),
                transaction_date=args.get("transaction_date")
            )
        elif name == "create_saving_goal":
            return execute_create_saving_goal(
                db, user_id,
                name=args.get("name", "Meta"),
                target_amount=float(args.get("target_amount", 0)),
                deadline=args.get("deadline")
            )
        elif name == "create_budget":
            return execute_create_budget(
                db, user_id,
                category_name=args.get("category_name", "Otros"),
                amount=float(args.get("amount", 0))
            )
        else:
            return {"status": "error", "message": f"Función '{name}' no soportada."}
    except Exception as e:
        logger.exception(f"Error al ejecutar herramienta de base de datos {name}")
        return {"status": "error", "message": f"Error interno al procesar base de datos: {str(e)}"}


# Endpoint Principal del Chat
@router.post("")
@limiter.limit("20/minute")
async def chat_with_agent(
    request: Request,
    body: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    message = body.get("message", "").strip()
    history = body.get("history", []) # Formato: [{"role": "user"|"model", "content": "texto"}]

    if not message:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")

    # Tope defensivo. Sin esto un user puede inflar costos de Gemini con prompts gigantes.
    MAX_MESSAGE_LEN = 4000
    if len(message) > MAX_MESSAGE_LEN:
        raise HTTPException(status_code=413, detail=f"Mensaje demasiado largo (máx {MAX_MESSAGE_LEN} caracteres).")

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    # Proxy de Gemini en Vercel (US). Render tiene la IP de egress geo-bloqueada por
    # Gemini ("User location is not supported"), así que en producción se enruta vía
    # el proxy. En local, si no hay proxy, se llama a Gemini directo con la key.
    proxy_url = os.getenv("GEMINI_PROXY_URL", "").strip()
    proxy_secret = os.getenv("GEMINI_PROXY_SECRET", "").strip()
    use_proxy = bool(proxy_url and proxy_secret)

    # --- FALLBACK: Si no hay forma de hablar con Gemini (ni proxy ni key directa) ---
    if not use_proxy and not gemini_key:
        logger.warning("GEMINI_API_KEY no configurada. Retornando respuesta mock de demostración.")
        
        lower_msg = message.lower()
        mock_response = {
            "response": "¡Hola! Soy Aki, tu asistente financiero personal.\n\n⚠️ **Nota de Configuración**: Para activar mi inteligencia artificial real y poder interactuar con tus datos usando lenguaje natural, debes configurar la variable `GEMINI_API_KEY` en el archivo `.env` del backend.\n\nComo demostración, si configuras la API Key podré responder preguntas como:\n- *'¿Cuánto tengo en total?'*\n- *'Anotá un gasto de $1500 en comida hoy con Mercado Pago'*\n- *'Crear una meta de ahorro de $50000 para Vacaciones'*\n\n¡Estoy listo para ayudarte apenas ingreses la clave!",
            "actionResult": None
        }
        
        # Simulación de respuesta interactiva en el mock si simulan un registro
        if "gasto" in lower_msg or "ingreso" in lower_msg or "anot" in lower_msg:
            mock_response["response"] = "He detectado que querés registrar una transacción. En el modo real con `GEMINI_API_KEY`, procesaría tu texto, identificaría los montos e impactaría de forma inmediata tu saldo en la base de datos."
            
        return mock_response

    # --- FLUJO REAL CON GEMINI API ---
    # 1. Preparar los contenidos (historial + mensaje actual)
    formatted_contents = []
    
    # Limitar historial para no inflar el contexto (últimos 10 mensajes)
    for msg in history[-10:]:
        role = "user" if msg.get("role") == "user" else "model"
        formatted_contents.append({
            "role": role,
            "parts": [{"text": msg.get("content", "")}]
        })
        
    # Añadir mensaje actual
    formatted_contents.append({
        "role": "user",
        "parts": [{"text": message}]
    })

    system_instruction = (
        "Eres Aki, el asistente financiero personal de la aplicación Vuelto (finanzapp). "
        "Tu tono es amigable, profesional, claro y optimista, utilizando modismos sutiles de Argentina (español rioplatense, voseo sutil si se siente natural pero profesional, ej. 'Hola, ¿cómo estás?', 'Registré', 'Tus balances'). "
        "Tienes acceso a herramientas para interactuar con la base de datos del usuario. "
        "Cuando el usuario te pida anotar un gasto, un ingreso, crear una meta o un presupuesto, DEBES llamar a la función correspondiente "
        "en lugar de inventar la respuesta. Si un usuario te pregunta por su dinero, balances o estado actual, llama a 'get_financial_summary' "
        "para obtener los datos verdaderos. ¡NUNCA inventes números o transacciones ficticias! "
        "CRÍTICO: Si el usuario te pide registrar una transacción (gasto o ingreso) pero no especifica la cuenta o medio de pago (ej. 'Efectivo', 'Mercado Pago'), NO llames a 'create_transaction'. En su lugar, debes responderle en texto preguntándole de qué cuenta desea realizar el movimiento. Si ya llamaste a 'get_financial_summary', puedes listarle sus cuentas disponibles para ayudarlo. "
        "Si no tienes suficientes datos para llamar a una función (ej. te dice 'anotá un gasto' pero no dice de cuánto ni en qué), pregúntale amablemente. "
        "La fecha de hoy es: " + str(date.today())
    )

    # Destino y headers según se use proxy (prod) o llamada directa (local).
    if use_proxy:
        gemini_target = proxy_url
        headers = {"Content-Type": "application/json", "x-proxy-secret": proxy_secret}
    else:
        gemini_target = f"{GEMINI_API_URL}?key={gemini_key}"
        headers = {"Content-Type": "application/json"}

    payload = {
        "contents": formatted_contents,
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "tools": [
            {
                "functionDeclarations": FUNCTIONS_SCHEMA
            }
        ]
    }

    action_result = None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Primera llamada a Gemini
            response = await client.post(
                gemini_target,
                json=payload,
                headers=headers
            )

            if response.status_code != 200:
                logger.error(f"Error de Gemini API: {response.status_code} - {response.text}")
                raise HTTPException(status_code=502, detail="Error de comunicación con el servicio de IA.")
                
            res_data = response.json()
            
            # Verificar si Gemini solicita ejecutar alguna función (Function Calling)
            candidates = res_data.get("candidates", [])
            if not candidates:
                return {"response": "No pude procesar tu mensaje. Inténtalo de nuevo.", "actionResult": None}
                
            first_candidate = candidates[0]
            content = first_candidate.get("content", {})
            parts = content.get("parts", [])
            
            function_calls = [p.get("functionCall") for p in parts if p.get("functionCall")]
            
            if function_calls:
                # El agente quiere llamar a una función
                func_call = function_calls[0]
                func_name = func_call.get("name")
                func_args = func_call.get("args", {})
                
                # No logueamos `func_args` — pueden contener montos / descripciones privadas.
                logger.info(f"Gemini solicitó función: {func_name}")
                
                # Ejecutar la acción real en la DB
                result = call_database_tool(func_name, func_args, db, current_user.id)
                action_result = result # Para enviar de vuelta al frontend para renderizar UI
                
                # Registrar el resultado de la función para enviárselo a Gemini
                # El flujo de Gemini requiere incluir el turno del modelo con el functionCall, y luego el functionResponse.
                formatted_contents.append(content) # Añadimos el functionCall
                
                formatted_contents.append({
                    "role": "user",
                    "parts": [
                        {
                            "functionResponse": {
                                "name": func_name,
                                "response": result
                            }
                        }
                    ]
                })
                
                # Segunda llamada a Gemini con los resultados de la DB
                payload["contents"] = formatted_contents
                # Removemos tools en la segunda llamada para acelerar respuesta o forzar a texto
                
                response2 = await client.post(
                    gemini_target,
                    json=payload,
                    headers=headers
                )
                
                if response2.status_code != 200:
                    logger.error(f"Error de Gemini API en segundo turno: {response2.status_code} - {response2.text}")
                    # Retornamos respuesta básica basada en el resultado de la función
                    return {
                        "response": result.get("message", "Operación completada con éxito."),
                        "actionResult": result
                    }
                    
                res_data2 = response2.json()
                candidates2 = res_data2.get("candidates", [])
                if candidates2:
                    parts2 = candidates2[0].get("content", {}).get("parts", [])
                    text_parts = [p.get("text") for p in parts2 if p.get("text")]
                    final_text = "".join(text_parts) if text_parts else "Procesé tu solicitud con éxito."
                    return {
                        "response": final_text,
                        "actionResult": action_result
                    }
                else:
                    return {
                        "response": result.get("message", "Operación procesada con éxito."),
                        "actionResult": action_result
                    }
            
            else:
                # Es una respuesta directa de texto
                text_parts = [p.get("text") for p in parts if p.get("text")]
                reply_text = "".join(text_parts) if text_parts else "Entendido. ¿En qué más puedo ayudarte?"
                return {
                    "response": reply_text,
                    "actionResult": None
                }
                
    except httpx.RequestError as exc:
        logger.error(f"Error de red al conectar con Gemini: {str(exc)}")
        raise HTTPException(status_code=503, detail="Servicio de IA temporalmente no disponible.")
    except Exception as e:
        logger.exception("Error inesperado en chat_with_agent")
        raise HTTPException(status_code=500, detail=f"Error interno en el chat: {str(e)}")
