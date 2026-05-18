<script>
import Button from './Button.vue';
import NavBar from './NavBar.vue';
import axios from 'axios';
    export default{
        data(){
            return{
                shopdata : [
                    {
                        icon: '🧨',
                        name: 'Динамит',
                        price: '3 🥔'
                    },
                    {
                        icon: '🏆',
                        name: 'Концовка',
                        price: '100 🥔'
                    },
                    {
                        icon: '⚠️',
                        name: 'Coming soon!',
                        price: ''
                    },
                    {
                        icon: '⚠️',
                        name: 'Coming soon!',
                        price: ''
                    },
                    {
                        icon: '⚠️',
                        name: 'Coming soon!',
                        price: ''
                    },
                    {
                        icon: '⚠️',
                        name: 'Coming soon!',
                        price: ''
                    },
                    {
                        icon: '⚠️',
                        name: 'Coming soon!',
                        price: ''
                    },
                    {
                        icon: '⚠️',
                        name: 'Coming soon!',
                        price: ''
                    }
                ],
                current_user: null,
                audio: null,
                isStoped: false
            };
        },
        mounted(){
            try{
                this.current_user = JSON.parse(localStorage.getItem('current_user'));
                this.playShopMusic();
            }catch(e){
                alert(e);
            }
        },
        beforeUnmount(){
            this.shopMusic.pause();
        },
        methods: {
            GoToMainMenu() { this.$router.push({name: 'mainmenu'}) },
            BuyItem(item_id){
                console.log(item_id);
                if(item_id > 1 || item_id < 0){
                    alert("Coming soon!");
                    return;
                }
                else{
                        switch(item_id){
                            case 0:
                                if(this.current_user.potatoes > 2){
                                    this.current_user.potatoes -= 3;
                                    this.current_user.dynamite += 1;
                                    localStorage.setItem('current_user', JSON.stringify(this.current_user));
                                    
                                    // НА ДАННЫЙ МОМЕНТ РАБОТАЕТ (17.12.25)
                                    const updatedData = {
                                        name: this.current_user.name,
                                        dynamite: this.current_user.dynamite,
                                        potatoes: this.current_user.potatoes,
                                        hasVictory: this.current_user.hasVictory
                                    };
                                    const user_id = this.current_user._id;
                                    axios.put(`/api/items/${user_id}`, updatedData)
                                    .then(response => {
                                        console.log('Update successful:', response.data);
                                    })
                                    .catch(error => {
                                        console.error('Error updating document:', error);
                                    });
                                    // НА ДАННЫЙ МОМЕНТ РАБОТАЕТ (17.12.25)
                                    this.audio = new Audio(`/assets/music/buysound.mp3`);
                                    this.audio.loop = false;
                                    this.audio.play();
                                    return;
                                
                                }
                                else{
                                    alert("Недостаточно картошки для обмена!");
                                    return;
                                }
                            case 1:
                                if(this.current_user.potatoes > 99){
                                    if(this.current_user.hasVictory == true){
                                        alert("Вы уже победили!");
                                        return;
                                    }
                                    this.current_user.potatoes -= 100;
                                    this.current_user.hasVictory = true;
                                    localStorage.setItem('current_user', JSON.stringify(this.current_user));
                                    
                                    // НА ДАННЫЙ МОМЕНТ РАБОТАЕТ (17.12.25)
                                    const updatedData = {
                                        name: this.current_user.name,
                                        dynamite: this.current_user.dynamite,
                                        potatoes: this.current_user.potatoes,
                                        hasVictory: this.current_user.hasVictory
                                    };
                                    const user_id = this.current_user._id;
                                    axios.put(`/api/items/${user_id}`, updatedData)
                                    .then(response => {
                                        console.log('Update successful:', response.data);
                                    })
                                    .catch(error => {
                                        console.error('Error updating document:', error);
                                    });
                                    // НА ДАННЫЙ МОМЕНТ РАБОТАЕТ (17.12.25)
                                    this.audio = new Audio(`/assets/music/buysound.mp3`);
                                    this.audio.loop = false;
                                    this.audio.play();
                                    alert("Поздравляем, Вы прошли игру! Теперь Вы можете собирать самое большое чилсо картошки!");
                                    return;
                                }
                                else{
                                    alert("Недостаточно картошки для обмена!");
                                    return;
                                }
                    }
                    
                }
            },
            playShopMusic() {
                if (this.currentMusic) {
                    this.currentMusic.pause();
                }
                this.shopMusic = new Audio(`/assets/music/shopping.mp3`);
                this.shopMusic.loop = true;
                this.shopMusic.play();
            },
            manipulateShopMusic(){
                if(!this.isStoped){ // МУЗЫКА НЕ ОСТАНОВЛЕНА
                    this.isStoped = true;
                    this.shopMusic.pause();
                }
                else{
                    this.isStoped = false;
                    this.shopMusic.play();
                }
            }
        },
        components: {
            NavBar,
            Button
        }
    }
</script>
<template>
    <div id="bodS">
    <NavBar>
        <template #left>
            <div class="btn-back">
                <Button></Button>
                <button @click="manipulateShopMusic" class="music-controller">{{ isStoped ? "🔈": "🔊" }}</button>
            </div>
        </template>
        <template #right>
            <div class="potato-balance">
                <p>{{current_user?.dynamite}} 🧨 &nbsp;</p>
                <p>{{current_user?.potatoes}} 🥔</p>
            </div>
        </template>
    </NavBar>
    <div>

    <!-- Таблица с товарами -->
     <table>
        <tbody>
            <tr v-for="(row,rowIndex) in Math.ceil(shopdata.length / 4)" :key="rowIndex">
                <th v-for="(col, colIndex) in 4" class="table-item" :key="colIndex">
                   <template v-if="(index = (row - 1) * 4 + (col - 1)) < shopdata.length">
                        <div :id="'item-'+index" class="item-container" @click="BuyItem(rowIndex * 4 + colIndex)">  
                            <p class="item-image">{{ shopdata[index].icon }}</p>
                            <p class="item">{{ shopdata[index].name }}</p>
                            <p class="item">{{ shopdata[index].price }}</p>
                        </div>
                    </template>
                    <template v-else>
                        <!-- Если данных нет - пусто -->
                    </template>
                </th>
            </tr>
        </tbody>
    </table>
    </div>
    </div>
</template>

<style scoped>
.btn-back{
    display: flex;
    align-items: center;
}
.potato-balance{
    display: flex;
    align-items: center;
}
/* Дополнительные стили для улучшения внешнего вида */
.potato-balance p {
    font-family: 'MV Boli', 'Comic Sans MS';
    text-shadow: 3px 3px 6px #D0C2C3;
    margin: 0;
    font-size: 2rem;
    color: #c7b9af;
}
/*РАБОТА С ФОНОМ*/
#bodS{
    width: 100vw;             /* ширина 100% от viewport */
    height: 100vh;            /* высота 100% от viewport */
    position: relative;
}
#bodS::before{
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('../../../public/assets/images/shop.png');
    background-position: center; /* центрирование изображения */
    background-size: cover;      /* масштабирование для покрытия всего блока */
    transition: background-image 1.1s ease;
    /* размытие */
    filter: blur(0px);
    -webkit-filter: blur(0px); /* Для старых браузеров */
    z-index: -1;
}
table {
    display: flex;
    justify-content: space-evenly;
    border-collapse: separate; 
    border-spacing: 30px;
    font-family: 'MV Boli', 'Comic Sans MS';
    text-shadow: 1px 1px 9px #D0C2C3;
    margin: 0;
    font-size: 1.5rem;
    color: #c7b9af;
}
.table-item{
    width: 375px;
    height: 250px;
    background-color: rgba(46, 56, 44, 0.4);
    transition: 0.2s;
}
.table-item:hover{
    background-color: rgba(92, 112, 88, 0.6);
    cursor: pointer;
    transform: scale(1.13);
}
.item{
    display: flex;
    justify-content: center;
    position: relative;
    top: 30px;
}
.item-image{
    font-size: 35px;
}
.music-controller{
    background: none;
    min-height: 82px;
    font-size: 22px;
    border: none;
    transition: 0.2s;
}
.music-controller:hover{
    cursor: pointer;
    transform: scale(1.3);
}

</style>