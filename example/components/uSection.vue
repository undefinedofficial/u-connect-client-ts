<template>
  <section class="unary-section">
    <header class="unary-section__header">
      <slot name="header"></slot>
    </header>

    <main class="unary-section__main">
      <slot name="main"></slot>
    </main>

    <footer class="unary-section__footer">
      <slot name="footer"></slot>
    </footer>
  </section>
</template>

<script lang="ts" setup></script>

<style>
.unary-section {
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.unary-section__header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-bottom: 1px solid gray;
}

.unary-section__main {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  border-left: 1px solid gray;
  border-right: 1px solid gray;
  overflow: auto;
  width: 100%;
  height: 100%;
}

.unary-section__footer {
  display: flex;
  flex-direction: column;
  border-left: 1px solid gray;
  border-right: 1px solid gray;
  border-bottom: 1px solid gray;
}
</style>
