<script>
import axios from 'axios';
export default{
    data(){
        return{
            name: ''
        }
    },
    methods: {
        GoToMainMenu(){
            this.$router.push({
            name: 'mainmenu'
            })
        },
        async submitForm() {
            try {
                const response = await axios.post('/api/register', {
                name: this.name
                });
                alert('Имя успешно отправлено!');
                this.name = '';
                this.GoToMainMenu();
            } catch (error) {
                console.error('Ошибка при отправке данных:', error);
                alert('Произошла ошибка при отправке данных.');
            }
        }
    }
}
</script>


<template>
    <div id="bodMM">
        <div class="title"><h1>РЕГИСТРАЦИЯ НОВОГО АККАУНТА</h1></div>
        <div class="form-block">
            <form @submit.prevent="submitForm">
                <input 
                    type="text" 
                    v-model="name" 
                    placeholder="Enter your name" 
                    required
                    class="input-text"
                >
                <button type="submit" class="submit-btn">ЗАРЕГИСТРИРОВАТЬСЯ</button>
            </form>
        </div>
    </div>    

</template>