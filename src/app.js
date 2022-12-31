
import chat_html from '../page/chat.html'
import login_html from '../page/login.html'
import { startChat } from './chat'

import { auth } from './firebase'
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";

const packageJSON = require('../package.json')

const body = document.body

init()

async function init() {
    const appConfig = await ipc.promise('getConfig')
    console.log(appConfig);

    body.insertAdjacentHTML('beforeend', login_html)

    document.getElementById('email').value = appConfig.email

    if (appConfig.password) {
        const decryptedPassword = await ipc.promise('decrypt', {
            hash: appConfig.password,
            secret: process.env.SECRET
        })
        document.getElementById('password').value = decryptedPassword
    }

    document.getElementById('version').textContent = packageJSON.version

    document.getElementById('win_min').addEventListener('click', (e) => {
        ipc.send('minimize')
    })

    document.getElementById('win_close').addEventListener('click', (e) => {
        console.log('close?');
        ipc.send('minimizeToTray')
    })

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
            const hashedPassword = await ipc.promise('encrypt', {
                password: password,
                secret: process.env.SECRET
            })

            saveConfig({
                email: email,
                password: hashedPassword
            }, appConfig)


        }
    })

    // document.getElementById('login').click()
}

function saveConfig(obj, appConfig) {
    const newConfig = Object.assign(appConfig, obj)
    console.log(newConfig);
    ipc.send('updateConfig', newConfig)
}