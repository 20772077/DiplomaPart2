import { createRouter, createWebHistory } from 'vue-router'

import GameBoard from './components/views/GameBoard.vue'
import MainMenu from './components/views/MainMenu.vue'
import ShopPage from './components/views/ShopPage.vue'
import AuthPage from './components/views/AuthPage.vue'
import LoginPage from './components/views/LoginPage.vue'
import EditPage from './components/views/EditPage.vue'
export default createRouter({
    // История переходов сохраняется
    history: createWebHistory(),

    // Роуты и компоненты
    routes: [
        {
            name: 'mainmenu',
            path: '/',
            component: MainMenu
        },
        {
            name: 'shop',
            path: '/shop',
            component: ShopPage
        },
        {
            name: 'register',
            path: '/register',
            component: AuthPage
        },
        {
            name: 'login',
            path: '/login',
            component: LoginPage
        },
        {
            name: 'edit',
            path: '/edit',
            component: EditPage
        },
        // СТАРОТОВАЯ ЛОКАЦИЯ ПОСЛЕ НАЖАТИЯ КОНПКИ "СТАРТ" В ГЛАВНОМ МЕНЮ
        {
            name: 'level0',
            path: '/start',
            component: GameBoard
        },
        {
            name: 'level1',
            path: '/left',
            component: GameBoard
        },
        {
            name: 'level2',
            path: '/right',
            component: GameBoard
        },
        {
            name: 'level3',
            path: '/up',
            component: GameBoard
        },
        {
            name: 'level4',
            path: '/dowm',
            component: GameBoard
        }
    ]
})