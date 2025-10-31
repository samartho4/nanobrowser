# Light Theme Implementation Design

## Overview

This design implements a comprehensive light theme system for the Shannon Chrome extension, building upon the existing dark theme infrastructure. The solution provides a centralized theme management system that ensures consistent theming across all UI components while maintaining backward compatibility with the current dark theme implementation.

## Architecture

### Theme Management System

The theme system follows a centralized architecture with the following key components:

1. **Theme Storage Service**: Manages theme preference persistence using Chrome extension storage
2. **Theme Context Provider**: React context that provides theme state and controls to all components
3. **Theme Hook**: Custom React hook for accessing theme state and toggle functionality
4. **Theme CSS Variables**: Centralized color definitions for both light and dark themes

### Component Integration Pattern

All UI components will follow a consistent pattern for theme integration:
- Accept theme state through React context or props
- Use conditional CSS classes based on theme state
- Maintain existing dark theme as default for backward compatibility

## Components and Interfaces

### Theme Storage Service

```typescript
interface ThemeStorageService {
  getTheme(): Promise<'light' | 'dark'>;
  setTheme(theme: 'light' | 'dark'): Promise<void>;
  onThemeChange(callback: (theme: 'light' | 'dark') => void): void;
}
```

**Location**: `packages/storage/lib/settings/theme.ts`

**Responsibilities**:
- Persist theme preference in Chrome extension storage
- Provide reactive updates when theme changes
- Handle migration from system preference detection to user preference

### Theme Context Provider

```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark';
  isDarkMode: boolean;
  isLightMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

**Location**: `packages/shared/lib/contexts/ThemeContext.tsx`

**Responsibilities**:
- Provide theme state to all child components
- Handle theme switching logic
- Sync theme changes across all extension pages
- Initialize theme from storage on app startup

### Theme Hook

```typescript
const useTheme = (): ThemeContextValue => {
  // Implementation details
}
```

**Location**: `packages/shared/lib/hooks/useTheme.tsx`

**Responsibilities**:
- Provide convenient access to theme context
- Handle theme-related side effects
- Ensure components re-render when theme changes

### Theme Toggle Component

```typescript
interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}
```

**Location**: `packages/ui/lib/components/ThemeToggle.tsx`

**Responsibilities**:
- Render theme toggle button with appropriate styling
- Provide visual feedback for current theme state
- Handle user interaction for theme switching

## Data Models

### Theme Configuration

```typescript
type Theme = 'light' | 'dark';

interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
  };
}

interface ThemeDefinition {
  light: ThemeConfig;
  dark: ThemeConfig;
}
```

### CSS Custom Properties

The theme system will use CSS custom properties for consistent color application:

```css
:root {
  /* Light theme colors */
  --color-primary-light: #0ea5e9;
  --color-background-light: #ffffff;
  --color-surface-light: #f8fafc;
  --color-text-primary-light: #1e293b;
  --color-text-secondary-light: #475569;
  --color-border-light: #e2e8f0;
  
  /* Dark theme colors */
  --color-primary-dark: #0ea5e9;
  --color-background-dark: #0f172a;
  --color-surface-dark: #1e293b;
  --color-text-primary-dark: #f1f5f9;
  --color-text-secondary-dark: #cbd5e1;
  --color-border-dark: #334155;
}

[data-theme="light"] {
  --color-primary: var(--color-primary-light);
  --color-background: var(--color-background-light);
  --color-surface: var(--color-surface-light);
  --color-text-primary: var(--color-text-primary-light);
  --color-text-secondary: var(--color-text-secondary-light);
  --color-border: var(--color-border-light);
}

[data-theme="dark"] {
  --color-primary: var(--color-primary-dark);
  --color-background: var(--color-background-dark);
  --color-surface: var(--color-surface-dark);
  --color-text-primary: var(--color-text-primary-dark);
  --color-text-secondary: var(--color-text-secondary-dark);
  --color-border: var(--color-border-dark);
}
```

## Error Handling

### Theme Loading Failures

- **Fallback Strategy**: Default to dark theme if storage read fails
- **Error Recovery**: Retry theme loading with exponential backoff
- **User Notification**: Silent fallback with console logging for debugging

### Theme Switching Failures

- **Optimistic Updates**: Update UI immediately, rollback on storage failure
- **Error States**: Maintain previous theme state if switching fails
- **User Feedback**: Show temporary error message for failed theme switches

### Cross-Page Synchronization

- **Message Passing**: Use Chrome extension messaging for theme sync
- **Storage Events**: Listen for storage changes to sync theme across pages
- **Race Condition Handling**: Use timestamps to resolve conflicting theme updates

## Testing Strategy

### Unit Tests

1. **Theme Storage Service Tests**
   - Test theme persistence and retrieval
   - Test storage error handling
   - Test theme change notifications

2. **Theme Context Tests**
   - Test theme state management
   - Test theme switching functionality
   - Test context provider initialization

3. **Theme Hook Tests**
   - Test hook return values
   - Test theme toggle functionality
   - Test hook re-rendering behavior

### Integration Tests

1. **Cross-Component Theme Application**
   - Test theme consistency across all UI components
   - Test theme switching affects all components
   - Test theme persistence across page reloads

2. **Extension Page Synchronization**
   - Test theme sync between side panel and options page
   - Test theme changes propagate to all open extension pages
   - Test theme state consistency during extension startup

### Visual Regression Tests

1. **Component Appearance Tests**
   - Screenshot comparison for light vs dark themes
   - Test all major UI components in both themes
   - Test theme transition animations

2. **Accessibility Tests**
   - Test color contrast ratios in light theme
   - Test keyboard navigation with theme toggle
   - Test screen reader compatibility

## Implementation Phases

### Phase 1: Core Theme Infrastructure
- Implement theme storage service
- Create theme context provider and hook
- Add CSS custom properties for light theme colors

### Phase 2: Component Integration
- Update existing components to use theme context
- Implement theme toggle component
- Add theme toggle to options page

### Phase 3: Cross-Page Synchronization
- Implement theme sync messaging
- Update all extension pages to use theme context
- Test theme consistency across all pages

### Phase 4: Polish and Testing
- Add theme transition animations
- Implement comprehensive test suite
- Perform accessibility and visual regression testing