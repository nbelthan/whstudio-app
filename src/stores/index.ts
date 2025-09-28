/**
 * Zustand store for WorldHuman Studio App global state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  User,
  Task,
  Submission,
  Payment,
  TaskFilters,
  TaskSortOptions,
  LoadingState,
  ErrorState,
  UserStats,
  EarningsData,
  TaskCategory,
  Notification,
  NotificationStats,
  NotificationPreferences,
  NotificationType
} from '@/types';

// Auth store slice
interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Tasks store slice
interface TasksSlice {
  tasks: Task[];
  currentTask: Task | null;
  filters: TaskFilters;
  sortOptions: TaskSortOptions;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    total?: number;
  };
  loading: LoadingState;
  errors: ErrorState;

  // Actions
  setTasks: (tasks: Task[]) => void;
  addTasks: (tasks: Task[]) => void;
  setCurrentTask: (task: Task | null) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  setSortOptions: (sortOptions: TaskSortOptions) => void;
  setPagination: (pagination: Partial<TasksSlice['pagination']>) => void;
  setTaskLoading: (key: string, loading: boolean) => void;
  setTaskError: (key: string, error: string | null) => void;
  resetTasks: () => void;
}

// Submissions store slice
interface SubmissionsSlice {
  submissions: Submission[];
  currentSubmission: Submission | null;
  loading: LoadingState;
  errors: ErrorState;

  // Actions
  setSubmissions: (submissions: Submission[]) => void;
  addSubmission: (submission: Submission) => void;
  updateSubmission: (submissionId: string, updates: Partial<Submission>) => void;
  setCurrentSubmission: (submission: Submission | null) => void;
  removeSubmission: (submissionId: string) => void;
  setSubmissionLoading: (key: string, loading: boolean) => void;
  setSubmissionError: (key: string, error: string | null) => void;
}

// Payments store slice
interface PaymentsSlice {
  payments: Payment[];
  pendingPayments: Payment[];
  loading: LoadingState;
  errors: ErrorState;

  // Actions
  setPayments: (payments: Payment[]) => void;
  addPayment: (payment: Payment) => void;
  updatePayment: (paymentId: string, updates: Partial<Payment>) => void;
  setPendingPayments: (payments: Payment[]) => void;
  setPaymentLoading: (key: string, loading: boolean) => void;
  setPaymentError: (key: string, error: string | null) => void;
}

// Notifications store slice
interface NotificationsSlice {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  stats: NotificationStats | null;
  loading: LoadingState;
  errors: ErrorState;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  updateNotification: (notificationId: string, updates: Partial<Notification>) => void;
  removeNotification: (notificationId: string) => void;
  markAsOpened: (notificationId: string) => void;
  markAsClicked: (notificationId: string) => void;
  markAllAsRead: () => void;
  setPreferences: (preferences: NotificationPreferences) => void;
  setStats: (stats: NotificationStats) => void;
  setNotificationLoading: (key: string, loading: boolean) => void;
  setNotificationError: (key: string, error: string | null) => void;
  clearNotifications: () => void;
  getUnreadCount: () => number;
}

// UI store slice
interface UISlice {
  theme: 'light' | 'dark';
  modals: {
    [key: string]: boolean;
  };
  toastNotifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    timestamp: number;
  }>;

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;
  addToastNotification: (notification: Omit<UISlice['toastNotifications'][0], 'id' | 'timestamp'>) => void;
  removeToastNotification: (id: string) => void;
  clearToastNotifications: () => void;
}

// Dashboard data slice
interface DashboardSlice {
  userStats: UserStats | null;
  earningsData: EarningsData | null;
  recentActivity: Array<{
    id: string;
    type: 'task_completed' | 'payment_received' | 'rating_given' | 'dispute_resolved';
    title: string;
    description: string;
    timestamp: string;
    amount?: number;
    currency?: string;
  }>;
  taskCategories: TaskCategory[];
  loading: LoadingState;
  errors: ErrorState;

  // Actions
  setUserStats: (stats: UserStats) => void;
  setEarningsData: (data: EarningsData) => void;
  setRecentActivity: (activity: DashboardSlice['recentActivity']) => void;
  addRecentActivity: (activity: DashboardSlice['recentActivity'][0]) => void;
  setTaskCategories: (categories: TaskCategory[]) => void;
  setDashboardLoading: (key: string, loading: boolean) => void;
  setDashboardError: (key: string, error: string | null) => void;
}

// Combined store type
type AppStore = AuthSlice & TasksSlice & SubmissionsSlice & PaymentsSlice & NotificationsSlice & UISlice & DashboardSlice;

// Create the store
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Auth slice
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        setUser: (user) => set({ user, isAuthenticated: !!user }),
        login: (user) => set({ user, isAuthenticated: true, error: null }),
        logout: () => set({
          user: null,
          isAuthenticated: false,
          error: null,
          // Clear user-specific data
          tasks: [],
          currentTask: null,
          submissions: [],
          currentSubmission: null,
          payments: [],
          pendingPayments: [],
          notifications: [],
          unreadCount: 0,
          preferences: null,
          stats: null,
          userStats: null,
          earningsData: null,
          recentActivity: []
        }),
        updateUser: (updates) => set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null
        })),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),

        // Tasks slice
        tasks: [],
        currentTask: null,
        filters: {},
        sortOptions: { field: 'created_at', direction: 'desc' },
        pagination: { limit: 20, offset: 0, hasMore: false },
        loading: {},
        errors: {},

        setTasks: (tasks) => set({ tasks }),
        addTasks: (newTasks) => set((state) => ({
          tasks: [...state.tasks, ...newTasks]
        })),
        setCurrentTask: (currentTask) => set({ currentTask }),
        updateTask: (taskId, updates) => set((state) => ({
          tasks: state.tasks.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
          ),
          currentTask: state.currentTask?.id === taskId
            ? { ...state.currentTask, ...updates }
            : state.currentTask
        })),
        removeTask: (taskId) => set((state) => ({
          tasks: state.tasks.filter(task => task.id !== taskId),
          currentTask: state.currentTask?.id === taskId ? null : state.currentTask
        })),
        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters }
        })),
        setSortOptions: (sortOptions) => set({ sortOptions }),
        setPagination: (pagination) => set((state) => ({
          pagination: { ...state.pagination, ...pagination }
        })),
        setTaskLoading: (key, loading) => set((state) => ({
          loading: { ...state.loading, [key]: loading }
        })),
        setTaskError: (key, error) => set((state) => ({
          errors: { ...state.errors, [key]: error }
        })),
        resetTasks: () => set({
          tasks: [],
          currentTask: null,
          filters: {},
          pagination: { limit: 20, offset: 0, hasMore: false }
        }),

        // Submissions slice
        submissions: [],
        currentSubmission: null,

        setSubmissions: (submissions) => set({ submissions }),
        addSubmission: (submission) => set((state) => ({
          submissions: [submission, ...state.submissions]
        })),
        updateSubmission: (submissionId, updates) => set((state) => ({
          submissions: state.submissions.map(submission =>
            submission.id === submissionId ? { ...submission, ...updates } : submission
          ),
          currentSubmission: state.currentSubmission?.id === submissionId
            ? { ...state.currentSubmission, ...updates }
            : state.currentSubmission
        })),
        setCurrentSubmission: (currentSubmission) => set({ currentSubmission }),
        removeSubmission: (submissionId) => set((state) => ({
          submissions: state.submissions.filter(sub => sub.id !== submissionId),
          currentSubmission: state.currentSubmission?.id === submissionId
            ? null
            : state.currentSubmission
        })),
        setSubmissionLoading: (key, loading) => set((state) => ({
          loading: { ...state.loading, [`submission_${key}`]: loading }
        })),
        setSubmissionError: (key, error) => set((state) => ({
          errors: { ...state.errors, [`submission_${key}`]: error }
        })),

        // Payments slice
        payments: [],
        pendingPayments: [],

        setPayments: (payments) => set({ payments }),
        addPayment: (payment) => set((state) => ({
          payments: [payment, ...state.payments]
        })),
        updatePayment: (paymentId, updates) => set((state) => ({
          payments: state.payments.map(payment =>
            payment.id === paymentId ? { ...payment, ...updates } : payment
          ),
          pendingPayments: state.pendingPayments.map(payment =>
            payment.id === paymentId ? { ...payment, ...updates } : payment
          )
        })),
        setPendingPayments: (pendingPayments) => set({ pendingPayments }),
        setPaymentLoading: (key, loading) => set((state) => ({
          loading: { ...state.loading, [`payment_${key}`]: loading }
        })),
        setPaymentError: (key, error) => set((state) => ({
          errors: { ...state.errors, [`payment_${key}`]: error }
        })),

        // Notifications slice
        notifications: [],
        unreadCount: 0,
        preferences: null,
        stats: null,

        setNotifications: (notifications) => set({
          notifications,
          unreadCount: notifications.filter(n => n.status === 'sent' || n.status === 'delivered').length
        }),
        addNotification: (notification) => set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: (notification.status === 'sent' || notification.status === 'delivered')
            ? state.unreadCount + 1
            : state.unreadCount
        })),
        updateNotification: (notificationId, updates) => set((state) => {
          const updatedNotifications = state.notifications.map(notification =>
            notification.id === notificationId ? { ...notification, ...updates } : notification
          );
          const newUnreadCount = updatedNotifications.filter(n => n.status === 'sent' || n.status === 'delivered').length;
          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount
          };
        }),
        removeNotification: (notificationId) => set((state) => {
          const filteredNotifications = state.notifications.filter(n => n.id !== notificationId);
          const newUnreadCount = filteredNotifications.filter(n => n.status === 'sent' || n.status === 'delivered').length;
          return {
            notifications: filteredNotifications,
            unreadCount: newUnreadCount
          };
        }),
        markAsOpened: (notificationId) => set((state) => {
          const updatedNotifications = state.notifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, status: 'opened' as const, opened_at: new Date().toISOString() }
              : notification
          );
          const newUnreadCount = updatedNotifications.filter(n => n.status === 'sent' || n.status === 'delivered').length;
          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount
          };
        }),
        markAsClicked: (notificationId) => set((state) => {
          const updatedNotifications = state.notifications.map(notification =>
            notification.id === notificationId
              ? {
                  ...notification,
                  status: 'clicked' as const,
                  clicked_at: new Date().toISOString(),
                  opened_at: notification.opened_at || new Date().toISOString()
                }
              : notification
          );
          const newUnreadCount = updatedNotifications.filter(n => n.status === 'sent' || n.status === 'delivered').length;
          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount
          };
        }),
        markAllAsRead: () => set((state) => ({
          notifications: state.notifications.map(notification =>
            (notification.status === 'sent' || notification.status === 'delivered')
              ? { ...notification, status: 'opened' as const, opened_at: new Date().toISOString() }
              : notification
          ),
          unreadCount: 0
        })),
        setPreferences: (preferences) => set({ preferences }),
        setStats: (stats) => set({ stats }),
        setNotificationLoading: (key, loading) => set((state) => ({
          loading: { ...state.loading, [`notification_${key}`]: loading }
        })),
        setNotificationError: (key, error) => set((state) => ({
          errors: { ...state.errors, [`notification_${key}`]: error }
        })),
        clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
        getUnreadCount: () => {
          const state = get();
          return state.notifications.filter(n => n.status === 'sent' || n.status === 'delivered').length;
        },

        // UI slice
        theme: 'dark',
        modals: {},
        toastNotifications: [],

        setTheme: (theme) => set({ theme }),
        openModal: (modalId) => set((state) => ({
          modals: { ...state.modals, [modalId]: true }
        })),
        closeModal: (modalId) => set((state) => ({
          modals: { ...state.modals, [modalId]: false }
        })),
        toggleModal: (modalId) => set((state) => ({
          modals: { ...state.modals, [modalId]: !state.modals[modalId] }
        })),
        addToastNotification: (notification) => set((state) => ({
          toastNotifications: [
            {
              ...notification,
              id: Math.random().toString(36).substr(2, 9),
              timestamp: Date.now()
            },
            ...state.toastNotifications
          ]
        })),
        removeToastNotification: (id) => set((state) => ({
          toastNotifications: state.toastNotifications.filter(n => n.id !== id)
        })),
        clearToastNotifications: () => set({ toastNotifications: [] }),

        // Dashboard slice
        userStats: null,
        earningsData: null,
        recentActivity: [],
        taskCategories: [],

        setUserStats: (userStats) => set({ userStats }),
        setEarningsData: (earningsData) => set({ earningsData }),
        setRecentActivity: (recentActivity) => set({ recentActivity }),
        addRecentActivity: (activity) => set((state) => ({
          recentActivity: [activity, ...state.recentActivity.slice(0, 49)] // Keep only last 50
        })),
        setTaskCategories: (taskCategories) => set({ taskCategories }),
        setDashboardLoading: (key, loading) => set((state) => ({
          loading: { ...state.loading, [`dashboard_${key}`]: loading }
        })),
        setDashboardError: (key, error) => set((state) => ({
          errors: { ...state.errors, [`dashboard_${key}`]: error }
        })),
      }),
      {
        name: 'worldhuman-app-store',
        // Only persist certain parts of the store
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          theme: state.theme,
          filters: state.filters,
          sortOptions: state.sortOptions,
        }),
      }
    ),
    {
      name: 'WorldHuman App Store',
    }
  )
);

// Selector hooks for better performance
export const useAuth = () => {
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const setUser = useAppStore((state) => state.setUser);
  const login = useAppStore((state) => state.login);
  const logout = useAppStore((state) => state.logout);
  const updateUser = useAppStore((state) => state.updateUser);
  const setLoading = useAppStore((state) => state.setLoading);
  const setError = useAppStore((state) => state.setError);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    setUser,
    login,
    logout,
    updateUser,
    setLoading,
    setError,
  };
};

export const useTasks = () => {
  const tasks = useAppStore((state) => state.tasks);
  const currentTask = useAppStore((state) => state.currentTask);
  const filters = useAppStore((state) => state.filters);
  const sortOptions = useAppStore((state) => state.sortOptions);
  const pagination = useAppStore((state) => state.pagination);
  const loading = useAppStore((state) => state.loading);
  const errors = useAppStore((state) => state.errors);
  const setTasks = useAppStore((state) => state.setTasks);
  const addTasks = useAppStore((state) => state.addTasks);
  const setCurrentTask = useAppStore((state) => state.setCurrentTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const removeTask = useAppStore((state) => state.removeTask);
  const setFilters = useAppStore((state) => state.setFilters);
  const setSortOptions = useAppStore((state) => state.setSortOptions);
  const setPagination = useAppStore((state) => state.setPagination);
  const setTaskLoading = useAppStore((state) => state.setTaskLoading);
  const setTaskError = useAppStore((state) => state.setTaskError);
  const resetTasks = useAppStore((state) => state.resetTasks);

  return {
    tasks,
    currentTask,
    filters,
    sortOptions,
    pagination,
    loading,
    errors,
    setTasks,
    addTasks,
    setCurrentTask,
    updateTask,
    removeTask,
    setFilters,
    setSortOptions,
    setPagination,
    setTaskLoading,
    setTaskError,
    resetTasks,
  };
};

export const useSubmissions = () => {
  const submissions = useAppStore((state) => state.submissions);
  const currentSubmission = useAppStore((state) => state.currentSubmission);
  const loading = useAppStore((state) => state.loading);
  const errors = useAppStore((state) => state.errors);
  const setSubmissions = useAppStore((state) => state.setSubmissions);
  const addSubmission = useAppStore((state) => state.addSubmission);
  const updateSubmission = useAppStore((state) => state.updateSubmission);
  const setCurrentSubmission = useAppStore((state) => state.setCurrentSubmission);
  const removeSubmission = useAppStore((state) => state.removeSubmission);
  const setSubmissionLoading = useAppStore((state) => state.setSubmissionLoading);
  const setSubmissionError = useAppStore((state) => state.setSubmissionError);

  return {
    submissions,
    currentSubmission,
    loading,
    errors,
    setSubmissions,
    addSubmission,
    updateSubmission,
    setCurrentSubmission,
    removeSubmission,
    setSubmissionLoading,
    setSubmissionError,
  };
};

export const usePayments = () => {
  const payments = useAppStore((state) => state.payments);
  const pendingPayments = useAppStore((state) => state.pendingPayments);
  const loading = useAppStore((state) => state.loading);
  const errors = useAppStore((state) => state.errors);
  const setPayments = useAppStore((state) => state.setPayments);
  const addPayment = useAppStore((state) => state.addPayment);
  const updatePayment = useAppStore((state) => state.updatePayment);
  const setPendingPayments = useAppStore((state) => state.setPendingPayments);
  const setPaymentLoading = useAppStore((state) => state.setPaymentLoading);
  const setPaymentError = useAppStore((state) => state.setPaymentError);

  return {
    payments,
    pendingPayments,
    loading,
    errors,
    setPayments,
    addPayment,
    updatePayment,
    setPendingPayments,
    setPaymentLoading,
    setPaymentError,
  };
};

export const useNotifications = () => {
  const notifications = useAppStore((state) => state.notifications);
  const unreadCount = useAppStore((state) => state.unreadCount);
  const preferences = useAppStore((state) => state.preferences);
  const stats = useAppStore((state) => state.stats);
  const loading = useAppStore((state) => state.loading);
  const errors = useAppStore((state) => state.errors);
  const setNotifications = useAppStore((state) => state.setNotifications);
  const addNotification = useAppStore((state) => state.addNotification);
  const updateNotification = useAppStore((state) => state.updateNotification);
  const removeNotification = useAppStore((state) => state.removeNotification);
  const markAsOpened = useAppStore((state) => state.markAsOpened);
  const markAsClicked = useAppStore((state) => state.markAsClicked);
  const markAllAsRead = useAppStore((state) => state.markAllAsRead);
  const setPreferences = useAppStore((state) => state.setPreferences);
  const setStats = useAppStore((state) => state.setStats);
  const setNotificationLoading = useAppStore((state) => state.setNotificationLoading);
  const setNotificationError = useAppStore((state) => state.setNotificationError);
  const clearNotifications = useAppStore((state) => state.clearNotifications);
  const getUnreadCount = useAppStore((state) => state.getUnreadCount);

  return {
    notifications,
    unreadCount,
    preferences,
    stats,
    loading,
    errors,
    setNotifications,
    addNotification,
    updateNotification,
    removeNotification,
    markAsOpened,
    markAsClicked,
    markAllAsRead,
    setPreferences,
    setStats,
    setNotificationLoading,
    setNotificationError,
    clearNotifications,
    getUnreadCount,
  };
};

export const useUI = () => {
  const theme = useAppStore((state) => state.theme);
  const modals = useAppStore((state) => state.modals);
  const toastNotifications = useAppStore((state) => state.toastNotifications);
  const setTheme = useAppStore((state) => state.setTheme);
  const openModal = useAppStore((state) => state.openModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const toggleModal = useAppStore((state) => state.toggleModal);
  const addToastNotification = useAppStore((state) => state.addToastNotification);
  const removeToastNotification = useAppStore((state) => state.removeToastNotification);
  const clearToastNotifications = useAppStore((state) => state.clearToastNotifications);

  return {
    theme,
    modals,
    toastNotifications,
    setTheme,
    openModal,
    closeModal,
    toggleModal,
    addToastNotification,
    removeToastNotification,
    clearToastNotifications,
  };
};

export const useDashboard = () => {
  const userStats = useAppStore((state) => state.userStats);
  const earningsData = useAppStore((state) => state.earningsData);
  const recentActivity = useAppStore((state) => state.recentActivity);
  const taskCategories = useAppStore((state) => state.taskCategories);
  const loading = useAppStore((state) => state.loading);
  const errors = useAppStore((state) => state.errors);
  const setUserStats = useAppStore((state) => state.setUserStats);
  const setEarningsData = useAppStore((state) => state.setEarningsData);
  const setRecentActivity = useAppStore((state) => state.setRecentActivity);
  const addRecentActivity = useAppStore((state) => state.addRecentActivity);
  const setTaskCategories = useAppStore((state) => state.setTaskCategories);
  const setDashboardLoading = useAppStore((state) => state.setDashboardLoading);
  const setDashboardError = useAppStore((state) => state.setDashboardError);

  return {
    userStats,
    earningsData,
    recentActivity,
    taskCategories,
    loading,
    errors,
    setUserStats,
    setEarningsData,
    setRecentActivity,
    addRecentActivity,
    setTaskCategories,
    setDashboardLoading,
    setDashboardError,
  };
};