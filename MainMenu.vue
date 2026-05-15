<script>
import axios from 'axios';
import HunterRLM from './../../services/hunter';
export default{
    data(){
        return{
            logged: false,
            current_user: null,
            isStoped: false,
        }
    },
    mounted() {
            // При загрузке страницы проверяем localStorage
            const storedLogged = localStorage.getItem('logged');
            console.log(storedLogged)
            this.logged = storedLogged === 'true';
            this.current_user = JSON.parse(localStorage.getItem('current_user'));

            if (this.currentMusic) {this.currentMusic.pause();}
            this.mainMenuMusic = new Audio(`assets/music/potatocatchertheme.mp3`);
            this.mainMenuMusic.loop = true;
            this.mainMenuMusic.play();
            /*const storedUser = localStorage.getItem('current_user');
            if (storedUser) {
                try {
                    this.current_user = JSON.parse(storedUser);
                } catch (e) {
                    console.error('Ошибка при парсинге current_user:', e);
                    this.current_user = null;
                }
            } else {
                this.current_user = null;
            }*/
        },
    beforeUnmount(){
      this.mainMenuMusic.pause();
    },
    methods: {
        async GoToGame(){
            if(this.logged === false){
                this.logged = true;
                localStorage.setItem('logged', this.logged);
                this.$router.push({
                    name: 'login'
                    })
            }
            else{            
            this.$router.push({
                    name: 'level0'
                })
            }
            // Инициализация охотника
            //const hunter_AI = new HunterRLM(12, 27);
            //await hunter_AI.buildModel();
            //console.log(hunter_AI);
            // Сохраняем модель в IndexedDB
            //await hunter_AI.model.save('indexeddb://hunter-model');
        },
        GoToShop(){
            if(this.logged === false){
                this.logged = true;
                localStorage.setItem('logged', this.logged)
                this.$router.push({
                    name: 'login'
                })
            }
            else{
                this.$router.push({
                    name: 'shop'
                })
            }
        },
        GoToAuth(){
            this.$router.push({
                name: 'register'
            })
        },
        GoToLoginLogout(){
            console.log(this.logged)
            if (this.logged) {
                    // Выходим из аккаунта
                    this.logged = false;
                    localStorage.removeItem('current_user')
                    localStorage.setItem('logged', this.logged)
                } else {
                    // Входим в аккаунт
                    this.logged = true;
                    localStorage.setItem('logged', this.logged)
                    this.$router.push({
                        name: 'login'
                    })
                }
        },
        EditAccount(){
            this.$router.push({
                name: 'edit'
            })
        },
        DeleteAccount(){
            const confirmed = confirm("Вы уверены, что хотите удалить аккаунт?");
            console.log(confirmed);
            if (confirmed) {
                // Выполнить удаление аккаунта
                // Вызвать API и удалить данные
                const user_deleted_id = this.current_user._id;
                axios.delete(`/api/users/${user_deleted_id}`)
                    .then(response => {
                    //alert('Пользователь удален');
                    // Можно обновить список пользователей или выполнить другие действия
                        this.logged = false;
                        localStorage.removeItem('current_user');
                        localStorage.setItem('logged', this.logged);
                        alert("Аккаунт удален");
                        this.$forceUpdate();
                    })
                    .catch(error => {
                    console.error('Ошибка удаления:', error);
                });
            } else {
                // Операция отменена
                alert("Удаление отменено");
            }
        },
        manipulateMainMenuMusic(){
            if(!this.isStoped){ // МУЗЫКА НЕ ОСТАНОВЛЕНА
                this.isStoped = true;
                this.mainMenuMusic.pause();
            }
            else{
                this.isStoped = false;
                this.mainMenuMusic.play();
            }
    },

    }
}
</script>

<template>
    <div id="bodMM">
        <button @click="manipulateMainMenuMusic" class="music-controller">{{ isStoped ? "🔈": "🔊" }}</button>
        <div class="game-title"><h1>POTATO CATCHER</h1></div>
        <div class="buttons">
            <div class="button-start">
                <button @click="GoToGame" class="start">ИГРАТЬ</button>
            </div>
            <div class="button-shop">
                <button @click="GoToShop" class="shop">МАГАЗИН</button>
            </div>
            <div class="button-login">
                <button @click="GoToLoginLogout" class="log">{{ logged ? 'ВЫЙТИ' : 'ВОЙТИ' }}</button>
            </div>
            <div class="button-register" v-if="!logged">
                <button @click="GoToAuth" class="register">РЕГИСТРАЦИЯ</button>
            </div>
        </div>
        <div class="username-block" v-if="current_user != null">
            <p class="username">{{ logged ? current_user?.name : ''  }}</p>
            <button class="user-button" @click="EditAccount" v-if="logged" title="Редактировать аккаунт">📝</button>
            <button class="user-button" @click="DeleteAccount" v-if="logged" title="Удалить аккаунт">❌</button>
        </div>
    </div>    
</template>

<style scoped>
.username-block{
    margin-top: 13.3%;
    margin-right: 1%;
    display: flex;
    justify-content: right;
    align-items: center;
}
.username{
    margin-right: 1%;
    padding: 1%;
    font-family:    'MV Boli',
                    'Comic Sans MS';
    font-size: 3vw;
    color: #ffffff;
}
.user-button{
    margin: 2px;
    min-height: 3vw;
    min-width: 3vw;
    background-color: #dcdcdc;
    font-size: 1vw;
    transition: 1s;
}
.user-button:hover{
    background-color: #ffffff;
    transform: scale(1.1);
}
.game-title{
    margin: 0 auto; /* Не сработает без width */
    margin-top: 3%;
    width: 39vw; /* Добавить явную ширину */
    padding: 1%;
    font-family:    'MV Boli',
                    'Comic Sans MS';
    font-size: 2vw;
    color: #000;
    text-shadow: 3px 3px 11px #ffffff;
    /*background-color: rgba(52, 35, 21, 0.3);*/
}

.start{
    margin: 1%;
    font-family:    'MV Boli',
                    'Comic Sans MS';
    width: 30rem; /* Добавить явную ширину */
    height: 5rem;
    cursor: pointer;
    border: none;
    background-color: #72cf01;
    font-size: 3rem;
    transition: 1s;
}
.start:hover{
    background-color: #8cff00;
    transition: 1s;
    transform: scale(1.1);
}

.shop{
    margin: 1%;
    font-family:    'MV Boli',
                    'Comic Sans MS';
    width: 30rem; /* Добавить явную ширину */
    height: 5rem;
    cursor: pointer;
    border: none;
    background-color: #9b6e15;
    font-size: 3rem;
    transition: 1s;
}
.shop:hover{
    background-color: #e6a31c;
    transition: 1s;
    transform: scale(1.1);
}
.register{
    margin: 1%;
    font-family:    'MV Boli',
                    'Comic Sans MS';
    width: 30rem; /* Добавить явную ширину */
    height: 5rem;
    cursor: pointer;
    border: none;
    background-color: #dcdcdc;
    font-size: 3rem;
    transition: 1s;
}
.register:hover{
    background-color: #ffffff;
    transition: 1s;
    transform: scale(1.1);
}
.log{
    margin: 1%;
    font-family:    'MV Boli',
                    'Comic Sans MS';
    width: 30rem; /* Добавить явную ширину */
    height: 5rem;
    cursor: pointer;
    border: none;
    background-color: #dcdcdc;
    font-size: 3rem;
    transition: 1s;
}
.log:hover{
    background-color: #ffffff;
    transition: 1s;
    transform: scale(1.1);
}

.buttons{
    margin: 0 auto; /* Не сработает без width */
    width: 250px; /* Добавить явную ширину */
    display: flex;
    justify-content: center; /* Центрирование по горизонтали */
    flex-direction: column;
    align-items: center;     /* Центрирование по вертикали */
}

/*РАБОТА С ФОНОМ*/
#bodMM{
    width: 100vw;             /* ширина 100% от viewport */
    height: 100vh;            /* высота 100% от viewport */
    position: relative;
}
#bodMM::before{
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('/assets/images/mainMenu1.jpg');
    background-position: center; /* центрирование изображения */
    background-size: cover;      /* масштабирование для покрытия всего блока */
    transition: background-image 1.1s ease;
    /* размытие */
    filter: blur(3px);
    -webkit-filter: blur(3px); /* Для старых браузеров */
    z-index: -1;
}

.music-controller{
    background: none;
    min-height: 43px;
    font-size: 22px;
    border: none;
    transition: 0.2s;
    margin-bottom: -43px;
    padding: 1%;
}
.music-controller:hover{
    cursor: pointer;
    transform: scale(1.3);
}
</style>