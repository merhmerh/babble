
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import chat_html from '../page/chat.html'
import login_html from '../page/login.html'
import { startChat } from './chat'
import { db } from './firebase';
import { login } from './login';
const { version } = require('../package.json')
const body = document.body

init()
async function init() {
    body.insertAdjacentHTML('beforeend', login_html)

    ipc.promise('checkUpdate').then(res => {
        document.getElementById('version').insertAdjacentHTML('beforeend', `
            ${version}<span class="v">${res[1]}</span>
        `)
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
        body.querySelector('#mainBackground > .background').style.opacity = 1
    }

    if (config.backgroundImage) {
        body.querySelector('#mainBackground > img').src = config.backgroundImage
        let bgColor, opacity
        const lum = config.backgroundLum
        if (lum > 50) {
            bgColor = 'white'
            opacity = (config.backgroundLum - 50) * 2 / 100
        } else {
            bgColor = config.backgroundColor
            opacity = 1 - ((config.backgroundLum) * 2 / 100)
        }
        body.querySelector('#mainBackground > .background').style.backgroundColor = bgColor
        body.querySelector('#mainBackground > .background').style.opacity = opacity
    }

    if (config.bannerColor) {
        body.querySelector('#bannerBackground > .background').style.backgroundColor = config.bannerColor
        body.querySelector('#bannerBackground > .background').style.opacity = 1
    }

    if (config.bannerImage) {
        body.querySelector('#bannerBackground > img').src = config.bannerImage
        let bgColor, opacity
        const lum = config.bannerLum
        if (lum > 50) {
            bgColor = 'white'
            opacity = (config.bannerLum - 50) * 2 / 100
        } else {
            bgColor = config.bannerColor
            opacity = 1 - ((config.bannerLum) * 2 / 100)
        }
        body.querySelector('#bannerBackground > .background').style.backgroundColor = bgColor
        body.querySelector('#bannerBackground > .background').style.opacity = opacity
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