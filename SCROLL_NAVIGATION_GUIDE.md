# Приховування навігації при скролінгу

Реалізовано функціональність автоматичного приховування верхнього заголовка і нижньої панелі вкладок при скролінгу вниз та їх показу при скролінгу вгору для економії місця на екрані.

## Компоненти

### 1. `useScrollVisibility` хук
Відстежує напрямок скролінгу та керує видимістю елементів навігації.

**Розташування:** `hooks/use-scroll-visibility.ts`

**Функціональність:**
- Відстежує напрямок скролінгу
- Приховує елементи при скролінгу вниз (поріг 50px)
- Показує елементи при скролінгу вгору
- Автоматично показує елементи через 2 секунди після зупинки скролу
- Синхронізується з глобальним контекстом панелі вкладок

### 2. `useTabBarVisibility` контекст
Глобальний стан для керування видимістю панелі вкладок.

**Розташування:** `hooks/use-tab-bar-visibility.ts`

**API:**
```typescript
const { isTabBarVisible, showTabBar, hideTabBar, setIsTabBarVisible } = useTabBarVisibility();
```

### 3. `AnimatedHeader` компонент
Анімований заголовок, який може приховуватися/показуватися.

**Розташування:** `components/AnimatedHeader.tsx`

**Властивості:**
- `title: string` - текст заголовка
- `isVisible: boolean` - видимість заголовка
- `backgroundColor?: string` - колір фону (за замовчуванням #007AFF)
- `textColor?: string` - колір тексту (за замовчуванням #FFFFFF)
- `rightComponent?: React.ReactElement` - компонент справа

### 4. `ScrollablePage` компонент
Обгортка для сторінок зі скролом та анімованим заголовком.

**Розташування:** `components/ScrollablePage.tsx`

**Властивості:**
- `children: React.ReactNode` - вміст сторінки
- `title: string` - заголовок сторінки
- `headerBackgroundColor?: string` - колір фону заголовка
- `headerTextColor?: string` - колір тексту заголовка
- `rightComponent?: React.ReactElement` - компонент справа в заголовку
- `refreshing?: boolean` - стан оновлення
- `onRefresh?: () => Promise<void>` - функція оновлення
- `contentContainerStyle?: any` - стилі контейнера контенту
- `showsVerticalScrollIndicator?: boolean` - показувати індикатор скролу

## Використання

### Базове використання ScrollablePage

```typescript
import { ScrollablePage } from '@/components/ScrollablePage';

export default function MyScreen() {
  return (
    <ScrollablePage title="Моя сторінка">
      <Text>Контент сторінки</Text>
      {/* Інший контент */}
    </ScrollablePage>
  );
}
```

### З функцією оновлення

```typescript
import { ScrollablePage } from '@/components/ScrollablePage';

export default function MyScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Логіка оновлення
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollablePage 
      title="Моя сторінка"
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <Text>Контент сторінки</Text>
    </ScrollablePage>
  );
}
```

### Кастомізація заголовка

```typescript
import { ScrollablePage } from '@/components/ScrollablePage';
import { TouchableOpacity } from 'react-native';
import { Settings } from 'lucide-react-native';

export default function MyScreen() {
  return (
    <ScrollablePage 
      title="Налаштування"
      headerBackgroundColor="#FFFFFF"
      headerTextColor="#000000"
      rightComponent={
        <TouchableOpacity onPress={() => console.log('Settings')}>
          <Settings size={20} color="#000000" />
        </TouchableOpacity>
      }
    >
      <Text>Контент сторінки</Text>
    </ScrollablePage>
  );
}
```

## Налаштування

### Інтеграція в проект

1. **Додати провайдер до кореневого layout:**

```typescript
// app/_layout.tsx
import { TabBarVisibilityProvider } from '@/hooks/use-tab-bar-visibility';

export default function RootLayout() {
  return (
    <TabBarVisibilityProvider>
      {/* Інші провайдери */}
      <RootLayoutNav />
    </TabBarVisibilityProvider>
  );
}
```

2. **Оновити layout вкладок:**

```typescript
// app/(tabs)/_layout.tsx
import { useTabBarVisibility } from '@/hooks/use-tab-bar-visibility';

export default function TabLayout() {
  const { isTabBarVisible } = useTabBarVisibility();
  
  const getTabScreenOptions = () => {
    return {
      // інші опції...
      tabBarStyle: {
        // інші стилі...
        display: isTabBarVisible ? 'flex' : 'none',
      },
    };
  };

  return (
    <Tabs screenOptions={getTabScreenOptions()}>
      {/* Вкладки */}
    </Tabs>
  );
}
```

### Параметри налаштування

- **Поріг скролінгу:** За замовчуванням 50px, можна змінити в `useScrollVisibility(threshold)`
- **Тривалість анімації:** 300ms для заголовка та панелі вкладок
- **Автопоказ:** Елементи автоматично з'являються через 2 секунди після зупинки скролу

## Приклади реалізації

### Сторінка налаштувань
Див. `app/(tabs)/settings.tsx` - повний приклад використання `ScrollablePage` з кастомним заголовком та контентом.

### Сторінка договорів
Див. `app/(tabs)/index.tsx` - можна адаптувати для використання нової системи навігації.

## Переваги

1. **Більше місця для контенту** - приховування навігації дає додатковий простір
2. **Плавні анімації** - використання React Native Animated API для плавних переходів
3. **Автоматичне керування** - елементи автоматично з'являються при потребі
4. **Кросплатформність** - працює на iOS, Android та Web
5. **Гнучкість** - легко налаштовувати та кастомізувати
6. **Продуктивність** - оптимізовані анімації з useNativeDriver

## Технічні деталі

- Використовує `transform: translateY` для анімацій
- Підтримує safe area insets
- Інтегрується з існуючою системою pull-to-refresh
- Автоматично обробляє різні розміри екранів
- Синхронізує стан між компонентами через React Context