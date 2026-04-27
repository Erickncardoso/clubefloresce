<template>
  <div class="app-container">
    <slot />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800&display=swap');

:root {
  --primary: #2d5a27;
  --primary-light: #4c8c4a;
  --secondary: #f4f7f6;
  --text-main: #333d3b;
  --text-muted: #66706e;
  --bg-app: #ffffff;
  --error: #e63946;
  --success: #2a9d8f;
  --border-radius: 12px;
  --transition: all 0.3s ease;
}

/* Global Icon Styles */
.icon, .status-icon, .icon-inline {
  width: 18px;
  height: 18px;
  stroke-width: 2px;
}

.xs-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.icon-inline {
  margin-right: 8px;
  display: inline-block;
  vertical-align: middle;
}

.placeholder-icon {
  width: 48px;
  height: 48px;
  color: #ccc;
}

.avatar-icon {
  width: 24px;
  height: 24px;
  color: var(--primary);
}

.play-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
  color: var(--primary);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Figtree', sans-serif;
}

body {
  background-color: var(--secondary);
  color: var(--text-main);
  line-height: 1.6;
}

.app-container {
  min-height: 100vh;
}

/* Scrollbar Styles */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--secondary);
}

::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
</style>
