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
import { ReferralCard } from '../features/common/components/ReferralCard';
import { toast } from 'sonner';
import { parseApiError } from '../lib/apiErrors';

export function SettingsPage() {
    const {
        settings, updateSettings,
        categories, addCategory, updateCategory, deleteCategory, // Categories
        transactions, budgets, accounts, // For export
        deleteUserAccount // For delete account
    } = useFinance();
    const { language, setLanguage, t } = useLanguage();
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
            toast.error(parseApiError(err, t('settings.toastDarkModeError')));
        }
    };

    const handleCurrencyChange = async (currency) => {
        try {
            await updateSettings({ currency });
            toast.success(t('settings.toastCurrencySuccess'));
        } catch (err) {
            toast.error(parseApiError(err, t('settings.toastCurrencyError')));
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
            toast.success(t('settings.toastCategoryDeleted'));
        } catch (error) {
            toast.error(parseApiError(error, t('settings.toastCategoryDeletedError')));
        } finally {
            setConfirmDeleteCategoryId(null);
        }
    };

    const handleSubmitCategory = async (formData) => {
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, formData);
                toast.success(t('settings.toastCategoryUpdated'));
            } else {
                await addCategory(formData);
                toast.success(t('settings.toastCategoryCreated'));
            }
            setIsCategoryFormOpen(false);
            setEditingCategory(null);
        } catch (error) {
            console.error(error);
            toast.error(parseApiError(error, t('settings.toastCategorySaveError')));
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
            toast.error(t('settings.toastDeleteAccountError') + error.message);
            setShowDeleteAccountModal(false);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <PageHeader
                    section="settings"
                    icon={SettingsIcon}
                    kicker={t('settings.kicker')}
                    title={t('settings.title')}
                    subtitle={t('settings.subtitle')}
                />

                {/* Appearance Settings */}
                <Card>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Palette className="w-5 h-5 text-zinc-500" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                {t('settings.appearance')}
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
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{t('settings.darkMode')}</p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {t('settings.darkModeDesc')}
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
                                {t('settings.regional')}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {/* Currency */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    {t('settings.currency')}
                                </label>
                                <select
                                    value={settings.currency || 'USD'}
                                    onChange={(e) => handleCurrencyChange(e.target.value)}
                                    aria-label={t('settings.currencyAria')}
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
                                {t('settings.dataManagement')}
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={handleOpenCategoryManager}
                                className="w-full px-4 py-2 text-left border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {t('settings.manageCategories')}
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {t('settings.manageCategoriesDesc')}
                                </p>
                            </button>

                            <button
                                onClick={handleExportData}
                                className="w-full px-4 py-2 text-left border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between"
                            >
                                <div>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {t('settings.exportData')}
                                    </p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {t('settings.exportDataDesc')}
                                    </p>
                                </div>
                                <Download className="w-5 h-5 text-zinc-400" />
                            </button>

                            <button
                                onClick={() => {
                                    resetOnboarding();
                                    toast.success(t('settings.viewTourToast'));
                                }}
                                className="w-full px-4 py-2 text-left border border-blue-200 dark:border-blue-900/30 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors flex items-center justify-between"
                            >
                                <div>
                                    <p className="font-medium text-blue-700 dark:text-blue-400">
                                        {t('settings.viewTour')}
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
                                        {t('settings.deleteAccount')}
                                    </p>
                                    <p className="text-sm opacity-80">
                                        {t('settings.deleteAccountDesc')}
                                    </p>
                                </div>
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Referidos — motor viral */}
                <ReferralCard />

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
            <Modal isOpen={showDeleteAccountModal} onClose={() => setShowDeleteAccountModal(false)} title={t('settings.deleteAccountModalTitle')}>
                <div className="space-y-5">
                    <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200/50 dark:border-rose-500/20">
                        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{t('settings.deleteAccountWarningTitle')}</p>
                            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{t('settings.deleteAccountWarningDesc')}</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            {t('settings.deleteAccountConfirmLabel')} <span className="font-black text-zinc-900 dark:text-white">{t('settings.deleteAccountConfirmWord')}</span> {t('settings.deleteAccountConfirmSuffix')}
                        </label>
                        <input
                            type="text"
                            value={deleteAccountInput}
                            onChange={(e) => setDeleteAccountInput(e.target.value)}
                            placeholder={t('settings.deleteAccountConfirmWord')}
                            className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50 transition-all font-mono"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowDeleteAccountModal(false)}
                            className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            {t('settings.cancel')}
                        </button>
                        <button
                            onClick={handleDeleteAccountConfirmed}
                            disabled={deleteAccountInput !== t('settings.deleteAccountConfirmWord')}
                            className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors"
                        >
                            {t('settings.deleteAccountConfirmButton')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Category Management Modal */}
            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => { setIsCategoryModalOpen(false); setIsCategoryFormOpen(false); setEditingCategory(null); }}
                title={isCategoryFormOpen ? (editingCategory ? t('settings.editCategory') : t('settings.newCategory')) : t('settings.myCategories')}
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
                                    {t('settings.new')}
                                </button>
                            </div>

                            <div className="space-y-2 max-h-[55vh] md:max-h-[50vh] overflow-y-auto pr-1 -mr-1">
                                {categories.length === 0 && (
                                    <p className="text-center text-zinc-500 py-4">{t('settings.noCategories')}</p>
                                )}
                                {categories.length > 0 && (
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 px-1 mb-2">
                                        {categories.length} {categories.length === 1 ? t('settings.categorySingular') : t('settings.categoryPlural')}
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
                                                {category.type === 'INCOME' ? t('settings.typeIncome') : t('settings.typeExpense')}
                                            </span>
                                            {category.taxDeductible && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded font-bold shrink-0" title={t('settings.afipBadgeTitle')}>
                                                    {t('settings.afipBadge')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                            {confirmDeleteCategoryId === category.id ? (
                                                <>
                                                    <button onClick={() => setConfirmDeleteCategoryId(null)} className="px-2 py-1 text-xs font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors">{t('settings.confirmNo')}</button>
                                                    <button onClick={handleConfirmDeleteCategory} className="px-2 py-1 text-xs font-bold bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">{t('settings.confirmYes')}</button>
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
