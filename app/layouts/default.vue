<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink class="brand" to="/">CMS</NuxtLink>
      <nav class="nav">
        <NuxtLink to="/">Overview</NuxtLink>
        <NuxtLink to="/admin">Admin</NuxtLink>
      </nav>
    </header>

    <main class="main">
      <slot />
    </main>
  </div>
</template>
