import { auth } from './firebase'
import { signInWithEmailAndPassword } from "firebase/auth";

export const login = new Promise(async (resolve) => {
    const appConfig = await ipc.promise('getConfig')
    console.log(appConfig);

    document.getElementById('email').value = appConfig.email ? appConfig.email : ''

    if (appConfig.password) {
        document.getElementById('remember').setAttribute('checked', '')
        const decryptedPassword = await ipc.promise('decrypt', {
            hash: appConfig.password,
            secret: process.env.SECRET
        })
        document.getElementById('password').value = decryptedPassword
    }

    document.getElementById('win_min').addEventListener('click', (e) => {
        ipc.send('minimize')
    })

    document.getElementById('win_close').addEventListener('click', (e) => {
        console.log('close?');
        ipc.send('minimizeToTray')
    })

    document.getElementById('remember').addEventListener('click', (e) => {
        document.getElementById('remember').toggleAttribute('checked')
    })

    document.getElementById('email').focus()
    document.querySelector('.field').querySelectorAll('input').forEach(el => {
        el.addEventListener('keydown', (e) => {
            if (e.key == 'Enter')
                document.getElementById('login').click()
        })
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
            resolve(user)
            const newConfig = { ...appConfig }
            newConfig['email'] = email

            //if remember password is off -> remove password from config
            if (!document.getElementById('remember').hasAttribute('checked')) {
                delete newConfig['password']
                return saveConfig(newConfig)
            }

            //save hashed password
            const hashedPassword = await ipc.promise('encrypt', {
                password: password,
                secret: process.env.SECRET
            })
            newConfig['password'] = hashedPassword
            saveConfig(newConfig)


        }
    })

    if (appConfig.autoLogin && appConfig.email && appConfig.password) {
        document.getElementById('login').click()
    }

})

function saveConfig(obj) {
    ipc.send('replaceConfig', obj)
}

