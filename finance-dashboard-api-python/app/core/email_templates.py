"""
Templates HTML inline para emails de Vueltito.

Sin Jinja — strings simples con .format() para minimizar dependencias. Los
estilos son inline porque la mayoría de los clientes de mail no soportan <style>.
"""
from __future__ import annotations

from decimal import Decimal


def _fmt_money(amount) -> str:
    """Formato AR para Decimal/float: $ 12.345,67"""
    try:
        n = Decimal(str(amount))
    except Exception:
        return "$0"
    sign = "-" if n < 0 else ""
    n = abs(n)
    s = f"{n:,.2f}"
    s = s.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{sign}$ {s}"


_BASE_CSS = """
font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
color:#18181b;
"""


def _wrap(inner: str, title: str) -> str:
    return f"""\
<!doctype html>
<html><body style="margin:0;padding:24px;background:#fafafa;{_BASE_CSS}">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e4e4e7">
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;letter-spacing:-0.01em">{title}</h1>
    {inner}
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0">
    <p style="font-size:11px;color:#71717a;margin:0">
      Recibís este mail porque tenés activadas las notificaciones de Vueltito.
      Podés desactivarlas desde Configuración.
    </p>
  </div>
</body></html>"""


def render_weekly_snapshot(user_name: str, data: dict) -> str:
    """
    data = {
      'week_label': 'Semana del 15-21 may',
      'top_expenses': [{'category': 'Comida', 'total': Decimal('12500')}, ...],
      'week_delta_pct': 12.4,   # vs semana anterior
      'goals_progress': [{'name': 'Vacaciones', 'delta': Decimal('25000')}],
      'insight': 'Esta semana gastaste 40% más en Delivery que el promedio.',
    }
    """
    top_rows = "\n".join(
        f"<tr><td style='padding:6px 0'>{e['category']}</td>"
        f"<td style='padding:6px 0;text-align:right;font-weight:700'>{_fmt_money(e['total'])}</td></tr>"
        for e in (data.get("top_expenses") or [])
    ) or "<tr><td colspan='2' style='color:#a1a1aa;font-style:italic'>Sin gastos esta semana</td></tr>"

    goals_rows = "\n".join(
        f"<li style='margin:4px 0'>{g['name']} <strong>+{_fmt_money(g['delta'])}</strong></li>"
        for g in (data.get("goals_progress") or [])
    ) or "<li style='color:#a1a1aa'>Sin avances esta semana</li>"

    delta = data.get("week_delta_pct")
    delta_str = ""
    if delta is not None:
        arrow = "↑" if delta >= 0 else "↓"
        color = "#dc2626" if delta >= 0 else "#16a34a"
        delta_str = f"<p style='color:{color};font-weight:700'>{arrow} {abs(delta):.1f}% vs. semana anterior</p>"

    insight = data.get("insight") or ""
    insight_block = (
        f"<div style='background:#f4f4f5;border-left:3px solid #10b981;padding:12px 14px;border-radius:8px;margin-top:16px'>"
        f"<strong style='font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#10b981'>Insight de Aki</strong>"
        f"<p style='margin:6px 0 0;font-size:14px'>{insight}</p></div>"
    ) if insight else ""

    inner = f"""
      <p style='font-size:14px'>Hola {user_name}, este es tu resumen de <strong>{data.get('week_label', 'la semana')}</strong>.</p>
      <h3 style='font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#52525b;margin:24px 0 8px'>Top gastos</h3>
      <table style='width:100%;border-collapse:collapse;font-size:14px'>{top_rows}</table>
      {delta_str}
      <h3 style='font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#52525b;margin:24px 0 8px'>Metas que avanzaron</h3>
      <ul style='padding-left:18px;margin:0;font-size:14px'>{goals_rows}</ul>
      {insight_block}
    """
    return _wrap(inner, "Tu semana en Vueltito")


def render_smart_alert(user_name: str, headline: str, body_html: str) -> str:
    inner = f"""
      <p style='font-size:14px'>Hola {user_name},</p>
      <h2 style='font-size:18px;margin:8px 0 12px;font-weight:800;letter-spacing:-0.01em'>{headline}</h2>
      <div style='font-size:14px;line-height:1.55'>{body_html}</div>
    """
    return _wrap(inner, "Aki tiene algo para decirte")
