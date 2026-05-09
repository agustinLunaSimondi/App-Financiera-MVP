import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';

import { Card } from '../features/common/components/Card';
import { Modal } from '../features/common/components/Modal';
import { CategoryForm } from '../features/categories/components/CategoryForm';
import { Moon, Sun, Globe, DollarSign, Palette, Download, Trash2, Edit2, Plus, X, PlayCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { resetOnboarding } from '../features/common/components/OnboardingTour';
import { toast } from 'sonner';

export function SettingsPage() {
    const {
        settings, updateSettings,
        categories, addCategory, updateCategory, deleteCategory, // Categories
        transactions, budgets, accounts, // For export
        deleteUserAccount // For delete account
    } = useFinance();
    const { setLanguage } = useLanguage();

    // State for Category Management
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const handleToggleDarkMode = async () => {
        await updateSettings({ darkMode: !settings.darkMode });
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

    const handleDeleteCategory = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
            try {
                await deleteCategory(id);
            } catch (error) {
                alert(error.message); // Show error (e.g. has transactions)
            }
        }
    };

    const handleSubmitCategory = async (formData) => {
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, formData);
            } else {
                await addCategory(formData);
            }
            setIsCategoryFormOpen(false);
            setEditingCategory(null);
        } catch (error) {
            console.error(error);
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
    const handleDeleteAccount = async () => {
        const confirmation = window.prompt("Esta acción es IRREVERSIBLE. Se eliminarán TODOS tus datos.\n\nEscribe 'ELIMINAR' para confirmar:");
        if (confirmation === 'ELIMINAR') {
            try {
                await deleteUserAccount();
                window.location.reload(); // Force reload to trigger logout/login screen
            } catch (error) {
                alert("Error al eliminar cuenta: " + error.message);
            }
        }
    };

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Configuración</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Personaliza tu experiencia</p>
                </div>

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
                                    value={settings.language || 'es'}
                                    onChange={async (e) => {
                                        const newLang = e.target.value;
                                        await updateSettings({ language: newLang });
                                        setLanguage(newLang);
                                    }}
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
                                    onChange={(e) => updateSettings({ currency: e.target.value })}
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
                                        Volvé a ver la guía de introducción de FinanzApp
                                    </p>
                                </div>
                                <PlayCircle className="w-5 h-5 text-blue-400" />
                            </button>

                            <button
                                onClick={handleDeleteAccount}
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
            </div>

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

                            <div className="space-y-2">
                                {categories.length === 0 && (
                                    <p className="text-center text-zinc-500 py-4">Sin categorías.</p>
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
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
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
