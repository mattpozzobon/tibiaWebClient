# React Components for Game UI

This directory contains React components organized for creating game UI elements. The setup uses a proper React build system with webpack bundling.

## 🏗️ **Architecture Overview**

### **Build System**
- **Webpack**: Bundles React components into `react.js`
- **TypeScript**: Full type safety for all components
- **JSX**: Modern React syntax with hooks and functional components
- **Separate Bundle**: React components are bundled separately from the main game code

### **Component Organization**
```
client/src/react/
├── README.md                           # This documentation
├── TopbarIsland.tsx                    # Topbar component (React)
├── LoginIsland.tsx                     # Login component (React)
├── react-bundle.tsx                    # Main React entry point
└── components/
    ├── game/                           # Game UI components
    │   ├── GameUI.tsx                  # Main game UI container
    │   ├── ChatWindow.tsx              # Chat system component
    │   ├── InventoryPanel.tsx          # Inventory management
    │   └── PlayerStats.tsx             # Player statistics display
    └── [other component categories...]
```

## 🎮 **Game UI Components**

### **GameUI.tsx** - Main Container
The main game UI component that manages all UI panels:
- **Toggle buttons** for different UI panels
- **State management** for active panels
- **Responsive layout** with fixed positioning

### **ChatWindow.tsx** - Chat System
A fully functional chat component with:
- **Multiple channels** (Global, Private, System)
- **Real-time messaging** with timestamps
- **Message history** with scrollable container
- **Form handling** for sending messages

### **InventoryPanel.tsx** - Inventory Management
Complete inventory system featuring:
- **Grid-based layout** for items
- **Item details** with descriptions and rarity
- **Interactive actions** (Use, Drop)
- **Visual feedback** with hover effects

### **PlayerStats.tsx** - Player Information
Comprehensive player stats display:
- **Vital bars** (Health, Mana, Experience) with animations
- **Skill values** in organized grid
- **Real-time updates** (ready for game integration)
- **Color-coded** progress bars

## 🔧 **Technical Features**

### **React Hooks Usage**
- `useState` for component state management
- `useEffect` for side effects and lifecycle
- `useRef` for DOM element references
- Custom hooks ready for complex state logic

### **TypeScript Integration**
- **Full type safety** with GameClient integration
- **Interface definitions** for all props and data structures
- **Generic types** for reusable components
- **Type checking** at compile time

### **CSS Styling**
- **Dedicated CSS file** (`react-components.css`)
- **Modern styling** with gradients and animations
- **Responsive design** with flexible layouts
- **Theme integration** matching game aesthetics

## 🚀 **Getting Started**

### **Adding New Components**

1. **Create component file** in appropriate directory:
```typescript
// client/src/react/components/game/MyComponent.tsx
import React from 'react';
import type GameClient from '../../../core/gameclient';

interface MyComponentProps {
  gc: GameClient;
}

export default function MyComponent({ gc }: MyComponentProps) {
  return <div>My Component</div>;
}
```

2. **Import in GameUI.tsx**:
```typescript
import MyComponent from './MyComponent';
```

3. **Add to GameUI render**:
```typescript
{activePanel === 'myPanel' && (
  <div className="ui-panel my-panel">
    <MyComponent gc={gc} />
  </div>
)}
```

### **Connecting to Game Client**

All components receive the `GameClient` instance as props:
```typescript
// Access game systems
gc.interface?.modalManager?.open?.("settings");
gc.networkManager.sendMessage("Hello World");
gc.database.getPlayerData();
```

### **State Management**

Use React hooks for component state:
```typescript
const [inventory, setInventory] = useState<Item[]>([]);
const [isLoading, setIsLoading] = useState(false);

// Update state based on game events
useEffect(() => {
  // Listen to game events
  gc.on('inventoryChanged', setInventory);
  return () => gc.off('inventoryChanged', setInventory);
}, [gc]);
```

## 📦 **Build Process**

### **Development**
```bash
npm run build  # Builds both main.js and react.js
```

### **File Output**
- `main.js` - Game engine and core systems
- `react.js` - All React components bundled together

### **Loading Order**
1. HTML loads → Login page injected
2. `main.js` loads → Game client initialized
3. `react.js` loads → React components mounted

## 🎨 **Styling Guidelines**

### **CSS Classes**
- Use semantic class names (`chat-window`, `inventory-slot`)
- Follow BEM methodology for complex components
- Maintain consistency with existing game styles

### **Responsive Design**
- Use `position: fixed` for UI overlays
- Implement `pointer-events: none/auto` for proper interaction
- Ensure components work on different screen sizes

### **Theme Integration**
- Use game's color palette (blues, golds, dark backgrounds)
- Match existing UI element styling
- Maintain visual consistency with game world

## 🔄 **Integration with Existing Systems**

### **Modal Manager**
```typescript
// Open existing modals from React components
gc.interface?.modalManager?.open?.("settings");
```

### **Network Manager**
```typescript
// Send network messages
gc.networkManager.sendChatMessage("Hello", "global");
```

### **Database**
```typescript
// Access game data
const playerData = await gc.database.getPlayerData();
```

## 🚧 **Future Enhancements**

### **Planned Features**
- **State management** with Redux/Zustand for complex state
- **Animation library** integration (Framer Motion)
- **Component library** for reusable UI elements
- **Testing setup** with React Testing Library
- **Storybook** for component documentation

### **Performance Optimizations**
- **Code splitting** for large component trees
- **Memoization** for expensive calculations
- **Virtual scrolling** for large lists
- **Lazy loading** for heavy components

## 📚 **Best Practices**

1. **Keep components focused** - One responsibility per component
2. **Use TypeScript** - Always type your props and state
3. **Handle loading states** - Show feedback during async operations
4. **Error boundaries** - Catch and handle React errors gracefully
5. **Accessibility** - Include ARIA labels and keyboard navigation
6. **Performance** - Use React.memo for expensive components

This setup provides a solid foundation for building complex, interactive game UI components with React while maintaining integration with your existing game systems.