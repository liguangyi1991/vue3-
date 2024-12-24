<script setup lang="ts">
import { useCounterStore } from "./stores/counter";

const store = useCounterStore();
</script>

<template>
  <div>{{ store.count }}</div>
  <button @click="store.increment()">修改</button>
</template>
