<script>
import axios from 'axios';
import '../../../pagesStyle.css'
export default{
    data(){
        return{
            name: '',
            current_user: null
        }
    },
    mounted(){
        this.current_user = JSON.parse(localStorage.getItem('current_user'));
        this.name = this.current_user.name
    },
    methods: {
        GoToMainMenu(){
            this.$router.push({
            name: 'mainmenu'
            })
        },
        async submitForm() {
            this.current_user.name = this.name;
            console.log(this.current_user.name);
            const updatedData = {
                name: this.current_user.name,
                dynamite: this.current_user.dynamite,
                potatoes: this.current_user.potatoes
            };
            const user_id = this.current_user._id;
            axios.put(`/api/items/${user_id}`, updatedData)
            .then(response => {
                console.log('Update successful:', response.data);
            })
            .catch(error => {
                console.error('Error updating document:', error);
            });
            localStorage.setItem('current_user', JSON.stringify(this.current_user));
            this.$router.push({
                    name: 'mainmenu'
                    });
        }
    }
}
</script>


<template>
    <div id="bodMM">
        <div class="title"><h1>ОБНОВЛЕНИЕ АККАУНТА</h1></div>
        <div class="form-block">
            <form @submit.prevent="submitForm">
                <input 
                    type="text" 
                    v-model="name" 
                    placeholder="Enter your name" 
                    required
                    class="input-text"
                >
                <button type="submit" class="submit-btn">ПОДТВЕРДИТЬ</button>
            </form>
        </div>
    </div>    

</template>