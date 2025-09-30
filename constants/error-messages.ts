// Українські повідомлення про помилки для користувачів
export const ERROR_MESSAGES = {
  // Загальні помилки
  UNKNOWN_ERROR: 'Виникла неочікувана помилка. Спробуйте ще раз.',
  NETWORK_ERROR: 'Проблеми з мережею. Перевірте інтернет-з\'єднання.',
  CONNECTION_FAILED: 'Не вдалося підключитися до сервера.',
  TIMEOUT_ERROR: 'Час очікування вичерпано. Спробуйте пізніше.',
  
  // Помилки аутентифікації
  LOGIN_FAILED: 'Невірний email або пароль.',
  USER_NOT_FOUND: 'Користувача не знайдено.',
  ACCOUNT_DISABLED: 'Обліковий запис деактивований.',
  INVALID_PASSWORD: 'Невірний пароль.',
  PASSWORD_TOO_SHORT: 'Пароль має містити мінімум 6 символів.',
  EMAIL_REQUIRED: 'Email є обов\'язковим полем.',
  PASSWORD_REQUIRED: 'Пароль є обов\'язковим полем.',
  
  // Помилки валідації
  REQUIRED_FIELD: 'Це поле є обов\'язковим.',
  INVALID_EMAIL: 'Невірний формат email.',
  INVALID_PHONE: 'Невірний формат телефону.',
  INVALID_DATE: 'Невірний формат дати.',
  DATE_IN_PAST: 'Дата не може бути в минулому.',
  END_DATE_BEFORE_START: 'Дата закінчення не може бути раніше дати початку.',
  
  // Помилки договорів
  CONTRACT_NOT_FOUND: 'Договір не знайдено.',
  CONTRACT_NUMBER_EXISTS: 'Договір з таким номером вже існує.',
  CONTRACT_NUMBER_REQUIRED: 'Номер договору є обов\'язковим.',
  CLIENT_NAME_REQUIRED: 'Назва клієнта є обов\'язковою.',
  INVALID_CONTRACT_DATES: 'Невірні дати договору.',
  
  // Помилки інженерів
  ENGINEER_NOT_FOUND: 'Інженера не знайдено.',
  ENGINEER_NAME_REQUIRED: 'Ім\'я інженера є обов\'язковим.',
  ENGINEER_ASSIGNED_TO_CONTRACTS: 'Неможливо видалити інженера. Він призначений до активних договорів.',
  SPECIALIZATION_REQUIRED: 'Спеціалізація є обов\'язковою.',
  
  // Помилки задач
  TASK_NOT_FOUND: 'Задачу не знайдено.',
  INVALID_TASK_DATE: 'Невірна дата задачі.',
  TASK_ALREADY_COMPLETED: 'Задача вже виконана.',
  
  // Помилки звітів
  REPORT_NOT_FOUND: 'Звіт не знайдено.',
  REPORT_CREATION_FAILED: 'Не вдалося створити звіт.',
  INVALID_REPORT_DATA: 'Невірні дані звіту.',
  
  // Помилки збереження даних
  SAVE_FAILED: 'Не вдалося зберегти дані.',
  LOAD_FAILED: 'Не вдалося завантажити дані.',
  DELETE_FAILED: 'Не вдалося видалити.',
  UPDATE_FAILED: 'Не вдалося оновити дані.',
  
  // Помилки файлів
  FILE_NOT_FOUND: 'Файл не знайдено.',
  INVALID_FILE_FORMAT: 'Невірний формат файлу.',
  FILE_TOO_LARGE: 'Файл занадто великий.',
  EXPORT_FAILED: 'Не вдалося експортувати дані.',
  IMPORT_FAILED: 'Не вдалося імпортувати дані.',
  
  // Помилки дозволів
  ACCESS_DENIED: 'Доступ заборонено.',
  INSUFFICIENT_PERMISSIONS: 'Недостатньо прав доступу.',
  
  // Помилки камери та медіа
  CAMERA_PERMISSION_DENIED: 'Доступ до камери заборонено.',
  CAMERA_NOT_AVAILABLE: 'Камера недоступна.',
  PHOTO_CAPTURE_FAILED: 'Не вдалося зробити фото.',
  
  // Помилки синхронізації
  SYNC_FAILED: 'Не вдалося синхронізувати дані.',
  OFFLINE_MODE: 'Додаток працює в офлайн режимі.',
  
  // Помилки QR коду
  QR_SCAN_FAILED: 'Не вдалося відсканувати QR код.',
  INVALID_QR_DATA: 'Невірні дані QR коду.',
  
  // Помилки періодів ТО
  MAINTENANCE_PERIOD_NOT_FOUND: 'Період ТО не знайдено.',
  INVALID_MAINTENANCE_DATES: 'Невірні дати періоду ТО.',
  MAINTENANCE_PERIOD_OVERLAP: 'Періоди ТО перетинаються.',
  
  // Помилки нотифікацій
  NOTIFICATION_PERMISSION_DENIED: 'Доступ до сповіщень заборонено.',
  NOTIFICATION_SEND_FAILED: 'Не вдалося відправити сповіщення.'
};

// Функція для отримання повідомлення про помилку
export const getErrorMessage = (error: any): string => {
  // Якщо це вже українське повідомлення, повертаємо як є
  if (typeof error === 'string' && error.includes('не вдалося') || error.includes('помилка') || error.includes('невірний')) {
    return error;
  }
  
  // Якщо це об'єкт Error з українським повідомленням
  if (error?.message && typeof error.message === 'string') {
    if (error.message.includes('не вдалося') || error.message.includes('помилка') || error.message.includes('невірний')) {
      return error.message;
    }
  }
  
  // Мапимо англійські помилки на українські
  const errorString = error?.message || error?.toString() || String(error);
  const lowerError = errorString.toLowerCase();
  
  // Помилки мережі
  if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  if (lowerError.includes('timeout')) {
    return ERROR_MESSAGES.TIMEOUT_ERROR;
  }
  
  // Помилки аутентифікації
  if (lowerError.includes('unauthorized') || lowerError.includes('invalid credentials')) {
    return ERROR_MESSAGES.LOGIN_FAILED;
  }
  
  if (lowerError.includes('user not found')) {
    return ERROR_MESSAGES.USER_NOT_FOUND;
  }
  
  // Помилки валідації
  if (lowerError.includes('required') || lowerError.includes('missing')) {
    return ERROR_MESSAGES.REQUIRED_FIELD;
  }
  
  if (lowerError.includes('invalid email')) {
    return ERROR_MESSAGES.INVALID_EMAIL;
  }
  
  if (lowerError.includes('invalid date')) {
    return ERROR_MESSAGES.INVALID_DATE;
  }
  
  // Помилки файлів
  if (lowerError.includes('file not found')) {
    return ERROR_MESSAGES.FILE_NOT_FOUND;
  }
  
  if (lowerError.includes('invalid file format')) {
    return ERROR_MESSAGES.INVALID_FILE_FORMAT;
  }
  
  // Помилки дозволів
  if (lowerError.includes('permission denied') || lowerError.includes('access denied')) {
    return ERROR_MESSAGES.ACCESS_DENIED;
  }
  
  // Помилки камери
  if (lowerError.includes('camera')) {
    return ERROR_MESSAGES.CAMERA_NOT_AVAILABLE;
  }
  
  // За замовчуванням повертаємо загальну помилку
  return ERROR_MESSAGES.UNKNOWN_ERROR;
};

// Функція для логування помилок (тільки для розробки)
export const logError = (error: any, context?: string) => {
  if (__DEV__) {
    console.error(`[${context || 'Error'}]:`, error);
  }
};

// Функція для показу помилки користувачу (можна розширити для toast/alert)
export const showUserError = (error: any, context?: string) => {
  const message = getErrorMessage(error);
  logError(error, context);
  
  // В майбутньому тут можна додати toast або інший UI для показу помилки
  console.warn('User Error:', message);
  
  return message;
};