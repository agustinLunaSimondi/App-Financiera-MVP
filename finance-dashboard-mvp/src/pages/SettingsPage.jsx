import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { useAuth } from '../contexts/AuthContext';

import { Card } from '../features/common/components/Card';
import { Modal } from '../features/common/components/Modal';
import { PageHeader } from '../features/common/components/PageHeader';
import { CategoryForm } from '../features/categories/components/CategoryForm';
import { Moon, Sun, Globe, DollarSign, Palette, Download, Trash2, Edit2, Plus, X, PlayCircle, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { resetOnboarding } from '../features/common/components/OnboardingTour';
import { TaxReportSection } from '../features/common/components/TaxReportSection';
import { WidgetsSection } from '../features/common/components/WidgetsSection';
import { toast } from 'sonner';
import { parseApiError } from '../lib/apiErrors';

export function SettingsPage() {
    const {
        settings, updateSettings,
        categories, addCategory, updateCategory, deleteCategory, // Categories
        transactions, budgets, accounts, // For export
        deleteUserAccount // For delete account
    } = useFinance();
    const { language, setLanguage } = useLanguage();
    const { logout } = useAuth();

    // State for Category Management
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState(null);
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [deleteAccountInput, setDeleteAccountInput] = useState('');

    const handleToggleDarkMode = async () => {
        const next = !settings.darkMode;
        // Aplicar inmediatamente para UX, sincronizar con backend en paralelo
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('darkMode', String(next));
        try {
            await updateSettings({ darkMode: next });
        } catch (err) {
            toast.error(parseApiError(err, 'No se pudo guardar la preferencia'));
        }
    };

    const handleCurrencyChange = async (currency) => {
        try {
            await updateSettings({ currency });
            toast.success('Moneda actualizada');
        } catch (err) {
            toast.error(parseApiError(err, 'Error al actualizar moneda'));
        }
    };

    // ============= CATEGORY MANAGEMENT =============
    const handleOpenCategoryManager = () => {
        setIsCategoryModalOpen(true);
        setIsCategoryFormOpen(false);
        setEditingCategory(null);
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setIsCategoryFormOpen(true);
    };

    const handleDeleteCategory = (id) => setConfirmDeleteCategoryId(id);

    const handleConfirmDeleteCategory = async () => {
        try {
            await deleteCategory(confirmDeleteCategoryId);
            toast.success('Categoría eliminada');
        } catch (error) {
            toast.error(parseApiError(error, 'Error al eliminar la categoría'));
        } finally {
            setConfirmDeleteCategoryId(null);
        }
    };

    const handleSubmitCategory = async (formData) => {
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, formData);
                toast.success('Categoría actualizada');
            } else {
                await addCategory(formData);
                toast.success('Categoría creada');
            }
            setIsCategoryFormOpen(false);
            setEditingCategory(null);
        } catch (error) {
            console.error(error);
            toast.error(parseApiError(error, 'Error al guardar la categoría'));
        }
    };

    // ============= EXPORT DATA =============
    const handleExportData = () => {
        const data = {
            exportDate: new Date().toISOString(),
            transactions,
            budgets,
            accounts,
            categories,
            settings
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ============= DELETE ACCOUNT =============
    const handleDeleteAccountConfirmed = async () => {
        try {
            await deleteUserAccount();
            logout();
        } catch (error) {
            toast.error('Error al eliminar cuenta: ' + error.message);
            setShowDeleteAccountModal(false);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <PageHeader
                    section="settings"
                    icon={SettingsIcon}
                    kicker="Preferencias"
                    title="Configuración"
                    subtitle="Personalizá tu experiencia: idioma, moneda, modo oscuro, categorías y datos."
                />

                {/* Appearance Settings */}
                <Card>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Palette className="w-5 h-5 text-zinc-500" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                Apariencia
                            </h3>
                        </div>

                        {/* Dark Mode Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {settings.darkMode ? (
                                    <Moon className="w-5 h-5 text-zinc-500" />
                                ) : (
                                    <Sun className="w-5 h-5 text-zinc-500" />
                                )}
                                <div>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Modo Oscuro</p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Cambia entre tema claro y oscuro
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleDarkMode}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.darkMode ? 'bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-700'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Regional Settings */}
                <Card>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Globe className="w-5 h-5 text-zinc-500" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                Configuración Regional
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Language */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Idioma
                                </label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    aria-label="Idioma de la interfaz"
                                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="es">Español</option>
                                    <option value="en">English</option>
                                </select>
                            </div>

                            {/* Currency */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Moneda
                                </label>
                                <select
                                    value={settings.currency || 'USD'}
                                    onChange={(e) => handleCurrencyChange(e.target.value)}
                                    aria-label="Moneda predeterminada"
                                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="USD">USD - Dólar Estadounidense</option>
                                    <option value="ARS">ARS - Peso Argentino</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="MXN">MXN - Peso Mexicano</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Data Management */}
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <DollarSign className="w-5 h-5 text-zinc-500" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                Gestión de Datos
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={handleOpenCategoryManager}
                                className="w-full px-4 py-2 text-left border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                    Gestionar Categorías
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Añade, edita o elimina categorías personalizadas
                                </p>
                            </button>

                            <button
                                onClick={handleExportData}
                                className="w-full px-4 py-2 text-left border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between"
                            >
                                <div>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                        Exportar Datos
                                    </p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Descarga tus datos en formato JSON
                                    </p>
                                </div>
                                <Download className="w-5 h-5 text-zinc-400" />
                            </button>

                            <button
                                onClick={() => {
                                    resetOnboarding();
                                    toast.success('El tour se mostrará al volver al dashboard');
                                }}
                                className="w-full px-4 py-2 text-left border border-blue-200 dark:border-blue-900/30 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors flex items-center justify-between"
                            >
                                <div>
                                    <p className="font-medium text-blue-700 dark:text-blue-400">
                                        Ver Tour Nuevamente
                                    </p>
                                    <p className="text-sm text-blue-500 dark:text-blue-500 opacity-80">
                                        Volvé a ver la guía de introducción de Vueltito
                                    </p>
                                </div>
                                <PlayCircle className="w-5 h-5 text-blue-400" />
                            </button>

                            <button
                                onClick={() => { setShowDeleteAccountModal(true); setDeleteAccountInput(''); }}
                                className="w-full px-4 py-2 text-left border border-red-200 dark:border-red-900/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-red-600 dark:text-red-400 flex items-center justify-between"
                            >
                                <div>
                                    <p className="font-medium">
                                        Eliminar Cuenta
                                    </p>
                                    <p className="text-sm opacity-80">
                                        Elimina permanentemente tu cuenta y todos los datos
                                    </p>
                                </div>
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Tax Report — #63 */}
                <Card>
                    <TaxReportSection />
                </Card>

                {/* Public Widgets — #64 */}
                <Card>
                    <WidgetsSection />
                </Card>
            </div>

            {/* Delete Account Confirmation Modal */}
            <Modal isOpen={showDeleteAccountModal} onClose={() => setShowDeleteAccountModal(false)} title="Eliminar Cuenta">
                <div className="space-y-5">
                    <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200/50 dark:border-rose-500/20">
                        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Esta acción es irreversible</p>
                            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Se eliminarán permanentemente tu cuenta, transacciones, presupuestos, metas y todos los datos asociados.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Escribí <span className="font-black text-zinc-900 dark:text-white">ELIMINAR</span> para confirmar:
                        </label>
                        <input
                            type="text"
                            value={deleteAccountInput}
                            onChange={(e) => setDeleteAccountInput(e.target.value)}
                            placeholder="ELIMINAR"
                            className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50 transition-all font-mono"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowDeleteAccountModal(false)}
                            className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDeleteAccountConfirmed}
                            disabled={deleteAccountInput !== 'ELIMINAR'}
                            className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors"
                        >
                            Eliminar mi cuenta
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Category Management Modal */}
            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => { setIsCategoryModalOpen(false); setIsCategoryFormOpen(false); setEditingCategory(null); }}
                title={isCategoryFormOpen ? (editingCategory ? 'Editar Categoría' : 'Nueva Categoría') : 'Mis Categorías'}
            >
                <div className="space-y-4">
                    {!isCategoryFormOpen ? (
                        <>
                            <div className="flex justify-end mb-2">
                                <button
                                    onClick={() => setIsCategoryFormOpen(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nueva
                                </button>
                            </div>

                            <div className="space-y-2 max-h-[55vh] md:max-h-[50vh] overflow-y-auto pr-1 -mr-1">
                                {categories.length === 0 && (
                                    <p className="text-center text-zinc-500 py-4">Sin categorías.</p>
                                )}
                                {categories.length > 0 && (
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 px-1 mb-2">
                                        {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
                                    </p>
                                )}
                                {categories.map(category => (
                                    <div key={category.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="w-4 h-4 rounded-full shrink-0"
                                                style={{ backgroundColor: category.color }}
                                            />
                                            <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate">
                                                {category.name}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 bg-zinc-200 dark:bg-zinc-600 rounded text-zinc-600 dark:text-zinc-300 shrink-0">
                                                {category.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                                            </span>
                                            {category.taxDeductible && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded font-bold shrink-0" title="Incluida en el reporte AFIP">
                                                    AFIP
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                            {confirmDeleteCategoryId === category.id ? (
                                                <>
                                                    <button onClick={() => setConfirmDeleteCategoryId(null)} className="px-2 py-1 text-xs font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors">No</button>
                                                    <button onClick={handleConfirmDeleteCategory} className="px-2 py-1 text-xs font-bold bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">Sí</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleEditCategory(category)}
                                                        className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg text-zinc-500 dark:text-zinc-400 transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(category.id)}
                                                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 dark:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <CategoryForm
                            onSubmit={handleSubmitCategory}
                            onCancel={() => {
                                setIsCategoryFormOpen(false);
                                setEditingCategory(null);
                            }}
                            initialData={editingCategory}
                        />
                    )}
                </div>
            </Modal>
        </>
    );
}
