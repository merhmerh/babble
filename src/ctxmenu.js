export default class ctxMenu {
    constructor(
        {
            selector = '',
            list = [],
            id = ''
        }
    ) {
        this.selector = selector
        this.id = id
        this.list = list

        const html = (() => {
            let html = ''
            list.forEach(item => {
                const imgTag = (() => {
                    if (item.icon) {
                        return `<img src="${item.icon}">`
                    } else {
                        return ''
                    }
                })()

                html += `<div class="item" data-ctx="${item.name}">
                ${imgTag}
                ${item.string ? item.string : item.name}
                </div>`
            })
            return html
        })()


        const menu = document.createElement('div')
        menu.insertAdjacentHTML('beforeend', html)
        menu.id = 'contextMenu'

        if (!selector) {
            return
        }

        selector.addEventListener('contextmenu', (e) => {
            if (document.querySelector('#contextMenu')) {
                document.querySelector('#contextMenu').remove()
            }

            const clientWidth = document.querySelector('#messagearea').clientWidth
            console.log(e.x, e.y, clientWidth);

            menu.style.top = e.y + 'px'
            menu.style.left = e.x + 'px'

            if (e.x + 200 >= clientWidth) {
                menu.style.left = e.x - 200 + 'px'
            }

            document.body.append(menu)

            document.querySelector('#messagearea').addEventListener("scroll", (event) => {
                menu.remove()
            }, { once: true })

            document.addEventListener('click', (e) => {
                menu.remove()
            }, { once: true })

        })


        this.menu = menu

        this.on = (name, callback) => {
            menu.querySelector(`.item[data-ctx="${name}"]`).addEventListener('click', (e) => {
                const el = menu.querySelector(`.item[data-ctx="${name}"]`)
                callback(el)
            })
        }
    }


}
