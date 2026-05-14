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
        GoToAuth(){
            this.$router.push({
                name: 'register'
            })
        },
        async submitForm() {
            try {
                const response = await axios.get('/api/register', { params: { name: this.name } });
                this.name = '';
                console.log(response.data[0]);
                localStorage.setItem('current_user', JSON.stringify(response.data[0]));
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
        <div class="title"><h1>ВОЙТИ В АККАУНТ</h1></div>
        <div class="form-block">
            <form @submit.prevent="submitForm">
                <input 
                    type="text" 
                    v-model="name" 
                    placeholder="Enter your name" 
                    required
                    class="input-text"
                >
                <button type="submit" class="submit-btn">ВХОД</button>
            </form>
        <div class="reg-block">
            <p class="reg-text">Нет аккаунта?</p>
            <button @click="GoToAuth" class="register-btn">РЕГИСТРАЦИЯ</button>
        </div>
        </div>
    </div>    

</template>