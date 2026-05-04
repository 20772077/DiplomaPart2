import { createRouter, createWebHistory } from 'vue-router'

import GameBoard from './components/views/GameBoard.vue'
export default createRouter({
    // История переходов сохраняется
    history: createWebHistory(),

    // Роуты и компоненты
    routes: [
        {
            name: 'level0',
            path: '/',
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