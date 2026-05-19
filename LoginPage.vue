<script>
import axios from 'axios';
import musicManager from './../../services/musicManager';
export default{
    data(){
        return{
            name: '',
            cameFrom: null
        }
    },
    mounted(){
        this.cameFrom = this.$route.params.cameFrom;
        console.log('Пришли из:', this.cameFrom); // 'GoToGame'
    },
    methods: {
        GoToMainMenu(){
            this.$router.push({
            name: 'mainmenu'
            })
        },
        GoToMainMenuWithoutLogin() {
            let logged = false;
            localStorage.setItem('logged', logged)
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
                console.log('response.data[0] = ', response.data[0]);
                localStorage.setItem('current_user', JSON.stringify(response.data[0]));
                // Проверяем, откуда пришли
                if (this.cameFrom === 'GoToGame' && response.data[0]) {
                    // Если пришли из кнопки "Играть"
                    musicManager.pause();  // Останавливаем музыку
                    this.$router.push({ name: 'level0' });

                } 
                if (response.data[0]){
                    this.GoToMainMenu();
                } else {
                    // Иначе в главное меню
                    alert('Произошла ошибка при входе');
                    this.name = '';
                    //location.reload();
                }
            } catch (error) {
                console.error('Ошибка при отправке данных:', error);
                alert('Произошла ошибка при отправке данных.', error);
            }
        }
    }
}
</script>


<template>
    <div id="bodMM">
        <button @click="GoToMainMenuWithoutLogin" class="register-btn">В главное меню</button>
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