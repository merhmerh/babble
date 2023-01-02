
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import chat_html from '../page/chat.html'
import login_html from '../page/login.html'
import { startChat } from './chat'
import { db } from './firebase';
import { login } from './login';

const packageJSON = require('../package.json')
const body = document.body

init()

async function init() {
    body.insertAdjacentHTML('beforeend', login_html)

    document.getElementById('version').innerHTML = `<span>${packageJSON.version}</span>`
    ipc.promise('checkUpdate').then(res => {
        document.getElementById('version').insertAdjacentHTML('beforeend', `<span class="v">${res}</span>`)
    })

    login.then(async user => {
        body.replaceChildren()
        body.insertAdjacentHTML('beforeend', chat_html)
        await setConfigStyle()
        await setUserProfile(user)
        body.querySelector('#loading').classList.add('fade')
        setTimeout(() => {
            body.querySelector('#loading').remove()
        }, 1500);
        startChat(user)

    })
}


async function setConfigStyle() {
    const config = await ipc.promise('getConfig')

    const body = document.body
    if (config.fontSize)
        body.querySelector('.chatarea').style.fontSize = config.fontSize + 'px'

    if (config.fontFamily)
        body.style.fontFamily = config.fontFamily


    if (config.backgroundColor) {
        body.querySelector('#mainBackground > .background').style.backgroundColor = config.backgroundColor
    }

    if (config.backgroundImage) {
        body.querySelector('#mainBackground > img').src = config.backgroundImage
        const opacity = config.backgroundLum
        if (opacity > 50) {
            body.querySelector('#mainBackground > .background').style.backgroundColor = 'white'
            body.querySelector('#mainBackground > .background').style.opacity = (config.backgroundLum - 50) * 2 / 100
        } else {
            body.querySelector('#mainBackground > .background').style.backgroundColor = config.backgroundColor
            body.querySelector('#mainBackground > .background').style.opacity = 1 - ((config.backgroundLum) * 2 / 100)
        }
    }


    if (config.bannerColor)
        body.querySelector('#bannerBackground > .background').style.backgroundColor = config.bannerColor

    if (config.bannerImage) {
        body.querySelector('#bannerBackground > img').src = config.bannerImage
        const opacity = config.backgroundLum
        if (opacity > 50) {
            body.querySelector('#bannerBackground > .background').style.backgroundColor = 'white'
            body.querySelector('#bannerBackground > .background').style.opacity = (config.backgroundLum - 50) * 2 / 100
        } else {
            body.querySelector('#bannerBackground > .background').style.backgroundColor = config.backgroundColor
            body.querySelector('#bannerBackground > .background').style.opacity = 1 - ((config.backgroundLum) * 2 / 100)
        }
    }

}


async function setUserProfile(user) {
    //get userProfileData
    //get otherUserId

    console.log(user);
    const docSnap = await getDoc(doc(db, 'users', 'chatroom'))
    const users = docSnap.data().users
    console.log(users);
    const uid = users.filter(u => u !== user.uid)[0]

    onSnapshot(doc(db, "users", uid), (doc) => {
        const data = doc.data()
        body.querySelector('header .profilepicture > img').src = data.profilePicture ? data.profilePicture : '../assets/profilepicture.svg'
        body.querySelector('header .profileinfo > .profilename').textContent = data.name
        body.querySelector('header .profileinfo > .profiledesc').textContent = data.about
    })
}