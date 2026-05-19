<script>
import axios from 'axios';
export default{
    data(){
        return{
            name: '',
            isVisible: false,
            visibility: 'hidden'
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
                const responseForBackToMainMenu = await axios.get('/api/register', { params: { name: this.name } });
                localStorage.setItem('current_user', JSON.stringify(responseForBackToMainMenu.data[0]));
                this.name = '';
                let logged = true;
                localStorage.setItem('logged', logged)
                this.GoToMainMenu();
            } catch (error) {
                console.error('Ошибка при отправке данных:', error);
                alert('Произошла ошибка при отправке данных.');
            }
        },
        introduction(){
            this.isVisible = true;
            this.visibility = 'visible'
            return;
        }
    }
}
</script>


<template>
    <div id="bodMM">
        <div class="title">
            <h1>РЕГИСТРАЦИЯ НОВОГО АККАУНТА</h1>
        </div>
        <div class="form-block">
            <form @submit.prevent="introduction">
                <input submitForm type="text" v-model="name" placeholder="Enter your name" required class="input-text">
                <button v-if="!isVisible" type="submit" class="submit-btn">ПРОДОЛЖИТЬ</button>
            </form>
        </div>
        <div v-if="isVisible" class="title intro-div">
            <img src="/assets/images/mayor2.png" alt="мэр" class="mayor-image">
            <div class="info-intro">
                <h2><i>Мэр</i></h2>
                <p :style="{ visibility: visibility }" class="intro-text">Приветствую, {{ this.name }}! К нам летел
                    самолёт с картошкой, но из-за невнимательности пилота вся картошка высыпалась по всей долине!
                    Ты поможешь нам собрать её?</p>
            </div>
        </div>

        <div v-if="isVisible" class="form-block">
            <button @click="submitForm" class="submit-btn">ЗАРЕГИСТРИРОВАТЬСЯ</button>
        </div>
    </div>

</template>