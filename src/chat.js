import { doc, addDoc, collection, query, onSnapshot, orderBy, limit, where, getDocs } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable, uploadString } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid'
import { db, storage } from './firebase';
import dayjs from "dayjs";

//change log
//timestamp in hh:ss format (tbd: allow toggle to h:ss a)
//notification, to prevent spam, new notification will only be sent after 5s from last notification.
//new message alert is shown, if window is not scroll to bottom when recieving message.
//minimize
//when close, minimize to tray, click tray icon to show again
//Right click tray to exit

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

    setTimeout(() => {
        scrollToBottom()
    }, 10);

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
        const data = []
        querySnaphot.forEach(doc => {
            data.push(doc.data())
        })

        data.reverse()

        data.forEach(msg => {
            const direction = msg.sender == user.uid ? 'right' : 'left'
            displayMessage(msg, direction)
        })

        console.log('Chat loaded');
    })()

    //send Message
    async function sendMessage() {
        const data = {
            message: textarea.value,
            timestamp: new Date(),
            sender: user.uid
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
                const msg = change.doc.data()
                const direction = msg.sender == user.uid ? 'right' : 'left'
                displayMessage(msg, direction).then(async (res) => {
                    const isfocus = await ipc.promise('isFocus')
                    if (isfocus || msg.sender == user.uid) {
                        return
                    }


                    if (cfg.allowNotification && cfg.readyNotification) {

                        const notification = new Notification('New Message', { body: `${msg.message}` })
                        ipc.send('flashFrame')

                        cfg.readyNotification = false

                        notification.onclick = (e) => {
                            e.preventDefault()
                            ipc.send('focusWindow')
                        }

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

                    const attachement_html = (() => {
                        const html = {
                            image: `<img src="${item.downloadUrl}">`,
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
                if (!data.message) {
                    return ''
                }

                //if message contain url
                const regexString = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/g
                const messageHTML = data.message.replace(regexString, "<a href='$1' target='_blank'>$1</a>")

                return `<div class="string">${messageHTML}</div>`

            })()

            const ts = data.timestamp.toDate();
            const time = dayjs(ts).format('hh:mm')

            const html = `
                <div class="message">
                ${attachment_html}${string_html}
                </div>
                <div class="timestamp">${time}</div>
        `

            const messagebox = document.createElement('div')
            messagebox.classList.add('messagebox')
            messagebox.classList.add('hidden')
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


}
