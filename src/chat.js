import { doc, addDoc, collection, query, onSnapshot, orderBy, limit, where, getDocs, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable, uploadString } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid'
import { db, storage } from './firebase';
import dayjs from "dayjs";
import settings_html from '../page/settings.html'
import ctxMenu from './ctxmenu';
import imgModal from './modal';
const AColorPicker = require('a-color-picker');


//autoscroll down check


export function startChat(user) {

    document.getElementById('win_min').addEventListener('click', (e) => {
        ipc.send('minimize')
    })

    document.getElementById('win_close').addEventListener('click', (e) => {
        console.log('close?');
        ipc.send('minimizeToTray')
    })

    const textarea = document.getElementById('textarea');
    const messageArea = document.getElementById('messagearea');
    const sendArea = document.getElementById('sendarea');
    const attachArea = document.getElementById('attachment');
    const attachments = []
    const cfg = {
        allowNotification: true,
        readyNotification: true,
    }

    messageArea.addEventListener('scroll', (e) => {
        const clientHeight = messageArea.clientHeight
        const scrollTop = messageArea.scrollTop
        const scrollHeight = messageArea.scrollHeight
        const isBottom = scrollHeight - scrollTop - clientHeight <= 200 ? true : false

        if (isBottom) {
            sendArea.querySelector('#newMessageAlert').classList.add('hidden')
        }
    })

    textarea.addEventListener('input', (e) => {
        textarea.style.height = 'auto'
        textarea.style.height = textarea.scrollHeight + 'px'
    })

    textarea.addEventListener('keydown', (e) => {
        const keyEnter = e.key == 'Enter' && !e.shiftKey ? true : false

        const notEmpty = textarea.value.length ? true : false


        //if empty do nothing
        if (keyEnter) {
            e.preventDefault()
        }

        //send message
        if (keyEnter && (notEmpty || attachments.length)) {
            sendMessage()
            textarea.value = ''
            attachArea.replaceChildren()
            attachments.length = 0
            return e.preventDefault()
        }
    })

    textarea.addEventListener('paste', async (e) => {
        console.log(e.clipboardData.files);
        const file = e.clipboardData.files[0]
        if (!file) {
            return
        }


        if (file.type.includes('image')) {
            const url = await getDataURL(file)
            const file_type = getFileType(file)
            const id = uuidv4()

            attachments.push({
                type: file_type,
                data: url,
                name: file.name,
                id: id
            })

            const html = `
            <div class="overlay mso">delete</div>
            <img src="${url}">
            `

            const container = document.createElement('div')
            container.classList.add('attachment_container')
            container.setAttribute('data-id', id)
            container.insertAdjacentHTML('beforeend', html)

            container.querySelector('.overlay').addEventListener('click', (e) => {
                const index = attachments.findIndex(x => x.id === id)
                attachments.splice(index, 1)
                container.remove()
            })

            attachArea.append(container)
        }
    })


    const sideBarContainer = document.getElementById('sideBarContainer');


    //toggle notification
    const notificationButton = document.getElementById('notificationButton')
    notificationButton.addEventListener('click', (e) => {
        if (notificationButton.getAttribute('data-attr') == 'on') {
            notificationButton.setAttribute('data-attr', 'off')
            cfg.allowNotification = false
        } else {
            notificationButton.setAttribute('data-attr', 'on')
            cfg.allowNotification = true
        }
    });

    //toggle menu
    const menuButton = document.getElementById('sidebarButton');
    menuButton.addEventListener('click', (e) => {
        const toggle = menuButton.getAttribute('data-attr')

        if (toggle == 'on') {
            menuButton.setAttribute('data-attr', 'off')
            sideBarContainer.classList.add('hidden')
        } else {
            menuButton.setAttribute('data-attr', 'on')
            sideBarContainer.classList.remove('hidden')
        }


    })

    sideBarContainer.querySelectorAll('.sidemenu > .item').forEach(el => {
        el.addEventListener('click', (e) => {

            //hide SideContent
            const active = sideBarContainer.querySelector('.sidemenu > .item[data-active]')
            if (el == active) {
                el.removeAttribute('data-active')
                return sideBarContainer.querySelector('#sideContent').classList.add('hidden')
            }

            //remove all sidebar attrbiute
            sideBarContainer.querySelectorAll('.sidemenu > .item').forEach(el => {
                el.removeAttribute('data-active')
            })

            el.setAttribute('data-active', '')

            if (el.id == 'menu_setting') {
                menuSetting(user)
            }
        })
    })


    //ignore event when dragging
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    //add attachment with drag and drop
    document.addEventListener('drop', async (e) => {

        e.preventDefault();
        e.stopPropagation();

        for (const f of e.dataTransfer.files) {

            const url = await getDataURL(f)
            const file_type = getFileType(f)

            const id = uuidv4()

            attachments.push({
                type: file_type,
                data: url,
                name: f.name,
                id: id
            })

            const attachement_html = (() => {
                const html = {
                    image: `<img src="${url}">`,
                    video: `<div class="video icon mso">movie</div>`,
                    code: `<div class="file icon mso">code</div>`,
                    file: `<div class="file icon mso">description</div>`,
                }

                return html[file_type]
            })()


            const html = `
                <div class="overlay mso">delete</div>
                ${attachement_html}
            `

            const container = document.createElement('div')
            container.classList.add('attachment_container')
            container.setAttribute('data-id', id)
            container.insertAdjacentHTML('beforeend', html)

            container.querySelector('.overlay').addEventListener('click', (e) => {
                const index = attachments.findIndex(x => x.id === id)
                attachments.splice(index, 1)
                container.remove()
            })

            attachArea.append(container)
        }

        document.getElementById('textarea').focus();
    });

    //init chat get prev messages
    const getChat = (async () => {
        const q = query(collection(db, "msges"),
            orderBy("timestamp", "desc"),
            limit(20)
        )
        const querySnaphot = await (getDocs(q))
        const msgarr = []

        onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type == 'modified') {
                    onMessageModified(change)
                    return
                }
            })
        })

        querySnaphot.forEach(doc => {
            if (doc.data().sender !== user.uid) {
                updateDoc(doc.ref, {
                    read: true
                })
            }
            const data = doc.data()
            data.id = doc.ref.id

            msgarr.push(data)
        })

        msgarr.reverse()

        msgarr.forEach(msg => {
            const direction = msg.sender == user.uid ? 'right' : 'left'
            displayMessage(msg, direction).then(() => {
                messageArea.querySelector(`.messagebox[data-id="${msg.id}"] > .timestamp `).setAttribute('data-read', 'true')
            })
        })

        console.log('Chat loaded');
        setTimeout(() => {
            scrollToBottom()
        }, 100);
    })()

    //send Message
    async function sendMessage() {
        const data = {
            message: textarea.value,
            timestamp: serverTimestamp(),
            sender: user.uid,
            read: false,
        }

        //upload to storage
        const attachment_obj = await new Promise(resolve => {
            if (attachments.length) {
                const promises = []
                for (const item of attachments) {
                    console.log(item);

                    const path = (() => {
                        if (['image', 'video'].includes(item.type)) {
                            return 'images'
                        } else {
                            return 'files'
                        }
                    })()

                    const filename = (() => {
                        const ext = item.name.split('.').pop()
                        return `${path}/${item.id}.${ext}`
                    })()

                    const storageRef = ref(storage, filename)

                    const uploadTask = new Promise((resolve) => {
                        uploadString(storageRef, item.data, 'data_url')
                            .then(async snapshot => {
                                const url = await getDownloadURL(snapshot.ref)
                                resolve({
                                    type: item.type,
                                    downloadUrl: url,
                                    name: item.name,
                                    path: filename,
                                })
                            })
                    })

                    promises.push(uploadTask)
                }

                Promise.all(promises).then(res => {
                    resolve(res)
                })
            } else {
                resolve()
            }
        })

        if (attachment_obj) {
            data.attachment = attachment_obj
        }
        console.log(data);
        const docRef = await addDoc(collection(db, "msges"), data)
    }

    //recieve Message
    recieveMessage()

    async function recieveMessage() {
        const now = new Date(new Date().toUTCString());
        const q = query(collection(db, "msges"),
            where("timestamp", ">", now),
        )

        const newMessage = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                console.log(change.type);

                if (change.type == 'modified') {
                    onMessageModified(change)
                    return
                }

                ipc.promise('isFocus').then(res => {
                    if (!res) {
                        return
                    }

                    if (change.doc.data().read) {
                        return
                    }

                    if (change.doc.data().sender == user.uid) {
                        return
                    }

                    updateDoc(change.doc.ref, {
                        read: true
                    })
                    return
                })


                //display message
                const msg = change.doc.data()
                msg.id = change.doc.ref.id
                const direction = msg.sender == user.uid ? 'right' : 'left'

                displayMessage(msg, direction).then(async (res) => {
                    ipc.once('focus', () => {
                        updateDoc(change.doc.ref, {
                            read: true
                        })
                    })

                    //Send notification
                    const isfocus = await ipc.promise('isFocus')
                    if (isfocus || msg.sender == user.uid) {
                        return
                    }

                    if (cfg.allowNotification && cfg.readyNotification) {

                        ipc.send('notify', msg.message)
                        ipc.send('flashFrame')

                        cfg.readyNotification = false
                    }

                    setTimeout(() => {
                        cfg.readyNotification = true
                    }, 5000);
                })
            })
        })

    }

    //display Message
    function displayMessage(data, position) {
        return new Promise((resolve) => {
            // console.log(data);
            const attachment_html = (() => {
                if (!data.attachment) {
                    return ''
                }
                let html = ''

                data.attachment.forEach(item => {
                    const ext = item.name.split('.').pop()

                    const attachement_html = (() => {
                        const html = {
                            image: `<img data-img-type="${ext}" src="${item.downloadUrl}">`,
                            video: `<video controls><source src="${item.data}"></video>`,
                            code: `<a href="${item.downloadUrl}" download="${item.name}" class="file">
                        <div class="icon mso">code</div>
                        <span>${item.name}</span>
                    </a>`,
                            file: `<a href="${item.downloadUrl}" download="${item.name}" class="file">
                        <div class="icon mso">description</div>
                        <span>${item.name}</span>
                    </a>`,
                        }

                        return html[item.type]
                    })()
                    html += `<div class="attachment">${attachement_html}</div>`
                })
                return html
            })()

            const string_html = (() => {
                if (data.status == 'deleted') {
                    return `<div class="string deleted">Message was deleted.</div>`
                }

                if (!data.message) {
                    return ''
                }

                //if message contain url
                const regexString = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/g
                const messageHTML = data.message.replace(regexString, "<a href='$1' target='_blank'>$1</a>")

                return `<div class="string ${data.status}">${messageHTML}</div>`

            })()

            const ts = data.timestamp.toDate();
            const time = dayjs(ts).format('HH:mm:ss')

            const html = `
                <div class="message">
                ${attachment_html}${string_html}
                </div>
                <div class="timestamp" data-read="${data.read ? "true" : "false"}">${time}</div>
            `

            const messagebox = document.createElement('div')
            messagebox.classList.add('messagebox')
            messagebox.classList.add('hidden')
            messagebox.setAttribute('data-id', data.id)
            messagebox.classList.add(position)

            messagebox.insertAdjacentHTML('beforeend', html)
            const promises = []

            messagebox.querySelectorAll('img').forEach(img => {
                promises.push(new Promise(resolve => {
                    img.onload = (() => {
                        resolve()
                    })
                }))
            })

            if (!data.message && data.attachment.length == 1) {
                messagebox.querySelector('.message').classList.add('single_img')
            }

            messageArea.append(messagebox)

            Promise.all(promises).then(() => {
                messagebox.classList.remove('hidden')
                resolve(true)

                const clientHeight = messageArea.clientHeight
                const scrollTop = messageArea.scrollTop
                const scrollHeight = messageArea.scrollHeight
                const isBottom = scrollHeight - scrollTop - clientHeight <= 200 ? true : false

                // if I am sender, always scroll to bottom
                if (data.sender === user.uid) {
                    return messageArea.scrollTop = messageArea.scrollHeight
                }

                // if recieved message and is bottom -> scroll to bottom
                if (isBottom) {
                    return messageArea.scrollTop = messageArea.scrollHeight
                }

                // if Recieved Message and is NOT bottom, show scroll to bottom
                addMessageAlert()
            })

            messagebox.querySelectorAll('.attachment img').forEach(img => {
                const contextMenu = new ctxMenu({
                    selector: img,
                    list: [{ name: 'open', string: 'Open', icon: '../assets/open.svg' },
                    { name: 'openTab', string: 'Open in new tab', icon: '../assets/opennewtab.svg' },
                    { name: 'download', string: 'Download', icon: '../assets/download.svg' }],
                })

                contextMenu.on('open', (el) => {
                    contextMenu.selector.click()
                })

                contextMenu.on('openTab', (el) => {
                    const src = contextMenu.selector.src;
                    window.open(src)
                })

                contextMenu.on('download', (el) => {
                    const src = contextMenu.selector.src;
                    ipc.send('download', src)
                })

                img.addEventListener('click', (e) => {
                    if (img.getAttribute('data-img-type') == 'gif') {
                        const newImg = document.createElement('img')
                        newImg.src = contextMenu.selector.src
                        img.src = newImg.src
                        return
                    }

                    const modal = new imgModal({
                        src: contextMenu.selector.src
                    })
                })
            })

            //Add Context Menu - EDIT, DELETE, REPLY
            const menuObj = (() => {
                let obj
                if (!data.message) {
                    return []
                }
                if (data.sender !== user.uid) {
                    obj = [{ name: 'reply' }]
                } else {
                    obj = [{
                        name: 'edit'
                    }, {
                        name: 'delete'
                    }]
                }
                return obj
            })()

            const contextMenu = new ctxMenu({
                id: data.id,
                selector: messagebox.querySelector('.message > .string'),
                list: menuObj,
            })

            if (!menuObj.length) {
                return
            }

            if (data.sender == user.uid) {
                contextMenu.on('edit', () => {
                    messageArea.querySelector(`.messagebox[data-id="${data.id}"] > .message > .string`).classList.add('hidden')

                    const editTextArea = document.createElement('textarea')

                    editTextArea.value = data.message
                    editTextArea.focus()
                    editTextArea.style.height = 'auto'
                    editTextArea.rows = 1
                    messageArea.querySelector(`.messagebox[data-id="${data.id}"] > .message`).append(editTextArea)
                    editTextArea.style.height = editTextArea.scrollHeight + 'px'

                    editTextArea.addEventListener('input', (e) => {
                        editTextArea.style.height = 'auto'
                        editTextArea.style.height = editTextArea.scrollHeight + 'px'
                    })

                    editTextArea.addEventListener('keydown', (e) => {
                        if (e.key == 'Escape') {
                            removeTextArea
                            return
                        }

                        const keyEnter = e.key == 'Enter' && !e.shiftKey ? true : false

                        if (keyEnter) {
                            e.preventDefault()
                            removeTextArea()

                            if (data.message === editTextArea.value) {
                                return
                            }

                            updateDoc(doc(db, `msges`, data.id), {
                                status: 'edited',
                                message: editTextArea.value
                            })
                        }

                        function removeTextArea() {
                            editTextArea.remove()
                            messageArea.querySelector(`.messagebox[data-id="${data.id}"] > .message > .string`).classList.remove('hidden')
                        }
                    })

                    scrollToBottom()
                })

                contextMenu.on('delete', () => {
                    updateDoc(doc(db, `msges`, data.id), {
                        status: 'deleted'
                    })
                })
            } else {
                contextMenu.on('reply', () => {
                    console.log('reply');
                })
            }
        })


    }

    //----------COMMON FUNCTION----------//

    //return file type (image,video,etc...)
    function getFileType(file) {
        const types = require('./configs/file_type.json')
        const ext = file.name.split('.').pop()
        for (const item of types) {
            if (item.ext.includes(ext)) {
                return item.type
            }
        }
        return 'file'
    }

    //return dataURL from blob/file
    function getDataURL(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader()
            fileReader.readAsDataURL(file)
            fileReader.onload = () => {
                resolve(fileReader.result)
            }
            fileReader.onerror = () => {
                reject(fileReader.error)
            }
        })

    }

    //scroll to bottom
    function scrollToBottom() {
        messageArea.scrollTop = messageArea.scrollHeight
    }

    function addMessageAlert() {
        const messageAlert = sendArea.querySelector('#newMessageAlert')
        messageAlert.classList.remove('hidden')

        messageAlert.addEventListener('click', (e) => {
            messageArea.scrollTop = messageArea.scrollHeight
            messageAlert.classList.add('hidden')
            return
        })
    }

    // document.getElementById('menu_setting').click()

    ipc.receive('focus', () => {
        scrollToBottom()
    })
}


async function menuSetting(user) {
    const body = document.body
    const sideBarContainer = document.getElementById('sideBarContainer');
    const sideContent = document.getElementById('sideContent');

    sideContent.classList.remove('hidden')
    if (sideContent.querySelector('#settings')) {
        return
    }

    sideContent.insertAdjacentHTML('beforeend', settings_html)
    const container = sideContent.querySelector('#settings')


    //set Value
    const config = await ipc.promise('getConfig')

    const docRef = doc(db, 'users', user.uid)
    const docSnap = await getDoc(docRef)
    const userData = docSnap.data()

    container.querySelector('#name').value = userData.name
    container.querySelector('#about').value = userData.about
    container.querySelector('#changeProfilePicture > img').src = userData.profilePicture

    container.querySelector('#font').value = config.fontFamily ? config.fontFamily : 'Default'
    container.querySelector('#fontSize').value = config.fontSize ? config.fontSize : 16
    container.querySelector('#fontSize').nextElementSibling.textContent = config.fontSize ? config.fontSize : 16
    container.querySelector('#selectBackgroundColor').style.backgroundColor = config.backgroundColor ? config.backgroundColor : '#222831'
    container.querySelector('#selectBannerColor').style.backgroundColor = config.bannerColor ? config.bannerColor : '#393e46'
    container.querySelector('#selectAccentColor').style.backgroundColor = config.bannerColor ? config.bannerColor : '#4565a4'
    if (config.backgroundImage)
        container.querySelector('#background_image img').src = config.backgroundImage

    if (config.bannerImage)
        container.querySelector('#banner_image img').src = config.bannerImage

    container.querySelector('#banner_brightness').value = config.bannerLum ? config.bannerLum : 50
    container.querySelector('#banner_brightness').nextElementSibling.textContent = config.bannerLum ? config.bannerLum : 50

    container.querySelector('#background_brightness').value = config.backgroundLum ? config.backgroundLum : 50
    container.querySelector('#background_brightness').nextElementSibling.textContent = config.backgroundLum ? config.backgroundLum : 50


    if (config.autoLogin)
        container.querySelector('#signin_automatically').setAttribute('checked', '')

    if (config.runOnStartup)
        container.querySelector('#run_on_startup').setAttribute('checked', '')

    if (config.backgroundColor) {
        container.querySelector('#backgroundColorPicker').setAttribute('acp-color', config.backgroundColor)
        container.querySelector('#selectBackgroundColor').style.backgroundColor = config.backgroundColor
    }

    if (config.bannerColor) {
        container.querySelector('#bannerColorPicker').setAttribute('acp-color', config.bannerColor)
        container.querySelector('#selectBannerColor').style.backgroundColor = config.bannerColor
    }

    AColorPicker.from('.picker').on('change', (picker, rawColor) => {
        const field = picker.element.parentElement.parentElement
        const id = field.id
        const color = AColorPicker.parseColor(rawColor, 'hex')
        field.style.backgroundColor = color;

        if (id == 'selectBackgroundColor') {
            body.querySelector('#mainBackground > .background').style.backgroundColor = color
            body.querySelector('#mainBackground > .background').style.opacity = 1
            return
        }

        if (id == 'selectBannerColor') {
            body.querySelector('#bannerBackground > .background').style.backgroundColor = color
            body.querySelector('#bannerBackground > .background').style.opacity = 1
            return
        }
    });

    container.querySelectorAll('.color-field').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            e.preventDefault()
            if (e.button == 1) {

                if (el.id == 'selectBackgroundColor') {
                    el.style.backgroundColor = '#222831'
                    body.querySelector('#mainBackground > .background').style.backgroundColor = '#222831'
                }

                if (el.id == 'selectBannerColor') {
                    el.style.backgroundColor = '#393e46'
                    body.querySelector('#bannerBackground > .background').style.backgroundColor = '#393e46'
                }

            }
        })

        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-field')) {
                const colorPicker = el.querySelector('.picker')
                if (colorPicker.classList.contains('hidden')) {
                    colorPicker.classList.remove('hidden')
                } else {
                    colorPicker.classList.add('hidden')
                }

            }

        })
    })

    container.querySelectorAll('.select-option > .select').forEach(el => {
        el.addEventListener('click', (e) => {
            el.nextElementSibling.classList.remove('hidden')
        })
    })

    container.querySelectorAll('.select-option > .dropdown > .option').forEach(el => {
        el.addEventListener('click', (e) => {
            el.parentElement.classList.add('hidden')
            //get parent id
            const id = el.parentElement.parentElement.id
            const value = el.textContent
            dropdownFunction(id, value)

        })
    })

    //when sign_in automatically 
    container.querySelector('#signin_automatically').addEventListener('click', (e) => {
        container.querySelector('#signin_automatically').toggleAttribute('checked')
    })

    container.querySelector('#run_on_startup').addEventListener('click', (e) => {
        container.querySelector('#run_on_startup').toggleAttribute('checked')
    })


    function dropdownFunction(id, value) {
        if (id == 'select_background') {
            document.getElementById(id).querySelector('.select').setAttribute('data-value', value)

            if (value.toLowerCase() == 'image') {
                document.getElementById('background_image').classList.remove('hidden')
            } else if (value.toLowerCase() == 'color') {
                document.getElementById('selectBackgroundColor').classList.remove('hidden')
                document.getElementById('background_image').classList.add('hidden')
            }

            return
        }

        if (id == 'select_banner') {
            document.getElementById(id).querySelector('.select').setAttribute('data-value', value)

            if (value.toLowerCase() == 'image') {
                document.getElementById('banner_image').classList.remove('hidden')
            } else if (value.toLowerCase() == 'color') {
                document.getElementById('selectBannerColor').classList.remove('hidden')
                document.getElementById('banner_image').classList.add('hidden')
            }

            return
        }
    }


    container.querySelector('#font').addEventListener('change', (e) => {
        const value = e.target.value
        if (value.toLowerCase() == 'default') {
            document.body.style.fontFamily = 'Inter';
        }
        document.body.style.fontFamily = e.target.value;
    });

    container.querySelector('#fontSize').addEventListener('input', (e) => {
        console.log(e.target.value);

        document.querySelector('.chatarea').style.fontSize = e.target.value + 'px';
        scrollToBottom()
    })

    //BACKGROUND 
    container.querySelector('#background_image > .image').addEventListener('click', async (e) => {
        const data_url = await ipc.promise('getFile')
        container.querySelector('#background_image > .image > img').src = data_url
        body.querySelector('#mainBackground > img').src = data_url
        body.querySelector('#mainBackground > .background').style.opacity = 0
        container.querySelector('#background_brightness').value = 50
        container.querySelector('#background_brightness').nextElementSibling.textContent = 50
    })

    container.querySelector('#background_image > .image').addEventListener('mousedown', async (e) => {
        e.preventDefault();
        if (e.button == 1) {
            container.querySelector('#background_image > .image > img').src = ""
            body.querySelector('#mainBackground > img').src = ""
        }
    })

    container.querySelector('#background_brightness').addEventListener('dblclick', (e) => {
        console.log('dbl');
        container.querySelector('#background_brightness').nextElementSibling.textContent = 50
        container.querySelector('#background_brightness').value = 50
        body.querySelector('#mainBackground > .background').style.opacity = 0
    })

    container.querySelector('#background_brightness').addEventListener('input', (e) => {
        const value = e.target.value
        container.querySelector('#background_brightness').nextElementSibling.textContent = value
        if (value > 50) {
            body.querySelector('#mainBackground > .background').style.backgroundColor = 'white'
            body.querySelector('#mainBackground > .background').style.opacity = (value - 50) * 2 / 100
        } else {
            const c = container.querySelector('#selectBackgroundColor').style.backgroundColor
            const hex = AColorPicker.parseColor(c, 'hex')
            body.querySelector('#mainBackground > .background').style.backgroundColor = hex
            body.querySelector('#mainBackground > .background').style.opacity = 1 - ((value) * 2 / 100)
        }
    })

    //BANNER
    container.querySelector('#banner_image > .image').addEventListener('click', async (e) => {
        const data_url = await ipc.promise('getFile')
        container.querySelector('#banner_image > .image > img').src = data_url
        body.querySelector('#bannerBackground > img').src = data_url
    })

    container.querySelector('#banner_image > .image').addEventListener('mousedown', async (e) => {
        e.preventDefault();
        if (e.button == 1) {
            container.querySelector('#banner_image > .image > img').src = ""
            body.querySelector('#bannerBackground > img').src = ""
        }
    })

    container.querySelector('#banner_brightness').addEventListener('dblclick', (e) => {
        console.log('dbl');
        container.querySelector('#banner_brightness').nextElementSibling.textContent = 50
        container.querySelector('#banner_brightness').value = 50
        body.querySelector('#bannerBackground > .background').style.opacity = 0
    })

    container.querySelector('#banner_brightness').addEventListener('input', (e) => {
        const value = e.target.value
        container.querySelector('#banner_brightness').nextElementSibling.textContent = value
        if (value > 50) {
            body.querySelector('#bannerBackground > .background').style.backgroundColor = 'white'
            body.querySelector('#bannerBackground > .background').style.opacity = (value - 50) * 2 / 100
        } else {
            const c = container.querySelector('#selectBannerColor').style.backgroundColor
            const hex = AColorPicker.parseColor(c, 'hex')
            body.querySelector('#bannerBackground > .background').style.backgroundColor = hex
            body.querySelector('#bannerBackground > .background').style.opacity = 1 - ((value) * 2 / 100)
        }
    })


    const name = container.querySelector('#name')
    name.addEventListener('change', (e) => {
        const docRef = doc(db, "users", user.uid)
        updateDoc(docRef, {
            name: name.value
        })
    })

    const about = container.querySelector('#about')
    about.addEventListener('change', (e) => {
        const docRef = doc(db, "users", user.uid)
        updateDoc(docRef, {
            about: about.value
        })
    })

    //change profilePicture
    container.querySelector('#changeProfilePicture').addEventListener('click', (e) => {
        ipc.promise('getFile').then(async src => {
            container.querySelector('#changeProfilePicture > img').src = src
            const storageRef = ref(storage, `users/${user.uid}/profilepicture`)
            const snapshot = await uploadString(storageRef, src, 'data_url')
            const url = await getDownloadURL(snapshot.ref)

            await updateDoc(doc(db, "users", user.uid), {
                profilePicture: url
            })

        })
    })

    //save
    container.querySelector('#save').addEventListener('click', (e) => {


        const data = {
            add: {
                fontFamily: container.querySelector('#font').value,
                fontSize: container.querySelector('#fontSize').value,
                autoLogin: container.querySelector('#signin_automatically').hasAttribute('checked'),
                runOnStartup: container.querySelector('#run_on_startup').hasAttribute('checked'),
                backgroundColor: AColorPicker.parseColor(body.querySelector('#mainBackground > .background').style.backgroundColor, 'hex'),
                bannerColor: AColorPicker.parseColor(body.querySelector('#bannerBackground > .background').style.backgroundColor, 'hex')
            },
            remove: ['autoSignin']
        }

        if (body.querySelector('#mainBackground .background').style.opacity == 1) {
            data.remove.push('backgroundImage')
        }

        if (body.querySelector('#bannerBackground .background').style.opacity == 1) {
            data.remove.push('bannerImage')
        }

        if (body.querySelector('#mainBackground img').getAttribute('src')) {
            const data_url = body.querySelector('#mainBackground img').getAttribute('src')
            data.add.backgroundImage = data_url
            data.add.backgroundLum = body.querySelector('#background_brightness').value
        } else {
            console.log('no background');
            data.remove.push('backgroundLum')
        }

        if (body.querySelector('#bannerBackground img').getAttribute('src')) {
            const data_url = body.querySelector('#bannerBackground img').getAttribute('src')
            data.add.bannerImage = data_url
            data.add.bannerLum = body.querySelector('#banner_brightness').value
        } else {
            data.remove.push('bannerLum')
        }

        ipc.promise('updateConfig', data).then(res => {
            console.log(res);
            sideContent.scrollTo({ top: 0, behavior: 'smooth' })
        })
    })
}


function scrollToBottom() {
    const messageArea = document.getElementById('messagearea');
    messageArea.scrollTop = messageArea.scrollHeight
}

function onMessageModified(change) {
    const messageArea = document.getElementById('messagearea');
    if (change.type !== "modified") {
        return
    }

    messageArea.querySelector(`.messagebox[data-id="${change.doc.id}"] > .timestamp `).setAttribute('data-read', 'true')

    if (change.doc.data().status == 'deleted') {
        const stringBox = messageArea.querySelector(`.messagebox[data-id="${change.doc.id}"] > .message > .string`)
        stringBox.textContent = 'Message was deleted.'
        stringBox.classList.add('deleted')
    }

    if (change.doc.data().status == 'edited') {
        const stringBox = messageArea.querySelector(`.messagebox[data-id="${change.doc.id}"] > .message > .string`)
        stringBox.textContent = change.doc.data().message
        stringBox.classList.add('edited')
    }
}