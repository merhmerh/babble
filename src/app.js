
import chat_html from '../page/chat.html'
import login_html from '../page/login.html'
import { startChat } from './chat'

import { auth } from './firebase'
import { signInWithEmailAndPassword } from "firebase/auth";

const packageJSON = require('../package.json')

const body = document.body


init()

async function init() {
    body.insertAdjacentHTML('beforeend', login_html)

    document.getElementById('version').textContent = packageJSON.version

    document.getElementById('win_min').addEventListener('click', (e) => {
        ipc.send('minimize')
    })

    document.getElementById('win_close').addEventListener('click', (e) => {
        console.log('close?');
        ipc.send('minimizeToTray')
    })



    document.getElementById('email').value = 'arvinhow95@gmail.com'
    document.getElementById('password').value = '008126'

    // document.getElementById('email').value = 'ognipil@gmail.com'
    // document.getElementById('password').value = '021113'


    document.getElementById('login').addEventListener('click', async (e) => {
        const email = document.getElementById('email').value
        const password = document.getElementById('password').value

        const user = await new Promise((resolve) => {
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    // Signed in 
                    const user = userCredential.user;
                    resolve(user)
                })
                .catch((error) => {
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    resolve(false)
                });
        })

        if (user) {
            console.log(user);
            body.replaceChildren()
            body.insertAdjacentHTML('beforeend', chat_html)
            startChat(user)
        }
    })

    document.getElementById('login').click()



}
