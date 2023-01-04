export default class imgModal {
    constructor(
        {
            src = '',
        }
    ) {
        this.src = src

        const modal = document.createElement('div')
        modal.id = 'modal'

        modal.insertAdjacentHTML('beforeend', `
        <div class="modalcontent">
            <img src="${src}">
            </div>
        `)

        document.querySelector('main').append(modal)

        modal.addEventListener('click', (e) => {
            modal.remove()
        })
    }
}