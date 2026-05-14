<script>
export default {
  name: 'NavBar'
}
</script>
<template>
    <nav class="nav-bar">
        <slot name="left"></slot>    <!-- Для левой части -->
        <slot name="right"></slot>   <!-- Для правой части -->
    </nav>
</template>

<style scoped> 
.nav-bar{
    width: 100vw;
    padding: 2vw;
    display: flex;
    align-items: center;
    justify-content: space-between; /* Распределяем пространство между элементами */
    background-color: rgba(46, 56, 44, 0.4);
    max-height: 85px;
}
</style>