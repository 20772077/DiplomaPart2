<script>
    export default{
    methods: {
        GoToMainMenu() { this.$router.push({name: 'mainmenu'}) },
    },
    }
</script>
<template>
    <button 
    @click="GoToMainMenu" 
    type="button" 
    class="btn-main-menu">Main Menu</button>
</template>
<style scoped>
.btn-main-menu{
  font-family: 'MV Boli', 'Comic Sans MS';
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  color: #A08D8F;
  font-size: 22px;
  min-height: 85px;
  transition: 0.2s;
  text-shadow: 3px 3px 9px #D0C2C3;
}
.btn-main-menu:hover{
  color: #c7b9af;
  background-color: rgba(92, 112, 88, 0.6);
  transform: scale(1.05);
}
</style>