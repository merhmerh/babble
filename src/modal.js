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
        <div draggable="true" class="modalcontent">
            <img src="${src}" class="dragme">
            </div>
        `)

        document.querySelector('main').append(modal)

        const img = modal.querySelector('.modalcontent img')
        img.addEventListener('wheel', (e) => {
            const scale = (() => {
                const s = img.style.transform
                const regexString = /scale\((.+)\)/
                const match = s.match(regexString) || ['', 1]
                let scale = match[1]
                return parseFloat(scale)
            })()
            if (e.wheelDelta > 0) {
                if (scale > 10) {
                    return
                }
                img.style.transform = `scale(${scale + 0.2})`
            } else {
                if (scale <= 1) {
                    return
                }
                img.style.transform = `scale(${scale - 0.2})`
            }
        })

        let drag, targ, offsetX, offsetY, coordX, coordY
        function startDrag(e) {
            // determine event object
            if (!e) {
                var e = window.event;
            }
            if (e.preventDefault) e.preventDefault();

            // IE uses srcElement, others use target
            targ = e.target ? e.target : e.srcElement;

            if (targ.className != 'dragme') { return };
            // calculate event X, Y coordinates
            offsetX = e.clientX;
            offsetY = e.clientY;

            // assign default values for top and left properties
            if (!targ.style.left) { targ.style.left = '0px' };
            if (!targ.style.top) { targ.style.top = '0px' };

            // calculate integer values for top and left 
            // properties
            coordX = parseInt(targ.style.left);
            coordY = parseInt(targ.style.top);
            drag = true;

            // move div element
            img.onmousemove = dragDiv;
            return false;
        }
        function dragDiv(e) {
            if (!drag) { return };
            if (!e) { var e = window.event };
            targ.style.left = coordX + e.clientX - offsetX + 'px';
            targ.style.top = coordY + e.clientY - offsetY + 'px';
            return false;
        }
        function stopDrag() {
            drag = false;
        }


        img.onmousedown = startDrag;
        img.onmouseup = stopDrag;


        modal.addEventListener('dblclick', (e) => {
            modal.remove()
        })

        modal.addEventListener('mousedown', (e) => {
            if (e.button == 1) {
                modal.remove()
            }
        })

        document.addEventListener('keydown', (e) => {
            if (e.key == 'Escape') {
                modal.remove()
            }
        })

    }
}