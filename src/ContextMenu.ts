import type { IContextMenuOptions, IContextMenuValue } from "./interfaces"
import { LiteGraph } from "./litegraph"

interface ContextMenuDivElement extends HTMLDivElement {
    value?: IContextMenuValue
    onclick_callback?: never
    closing_timer?: number
}

/**
 * ContextMenu from LiteGUI
 *
 * @class ContextMenu
 * @constructor
 * @param {Array} values (allows object { title: "Nice text", callback: function ... })
 * @param {Object} options [optional] Some options:\
 * - title: title to show on top of the menu
 * - callback: function to call when an option is clicked, it receives the item information
 * - ignore_item_callbacks: ignores the callback inside the item, it just calls the options.callback
 * - event: you can pass a MouseEvent, this way the ContextMenu appears in that position
 */
export class ContextMenu {
    options?: IContextMenuOptions
    parentMenu?: ContextMenu
    root: ContextMenuDivElement
    current_submenu?: ContextMenu
    lock?: boolean

    // TODO: Interface for values requires functionality change - currently accepts an array of strings, functions, objects, nulls, or undefined.
    constructor(values: (IContextMenuValue | string)[], options: IContextMenuOptions) {
        options ||= {}
        this.options = options
        const that = this

        //to link a menu with its parent
        const parent = options.parentMenu
        if (parent) {
            if (!(parent instanceof ContextMenu)) {
                console.error("parentMenu must be of class ContextMenu, ignoring it")
                options.parentMenu = null
            } else {
                this.parentMenu = parent
                this.parentMenu.lock = true
                this.parentMenu.current_submenu = this
            }
            if (parent.options?.className === "dark") {
                options.className = "dark"
            }
        }

        //use strings because comparing classes between windows doesnt work
        const eventClass = options.event
            ? options.event.constructor.name
            : null
        if (eventClass !== "MouseEvent" &&
            eventClass !== "CustomEvent" &&
            eventClass !== "PointerEvent") {
            console.error(`Event passed to ContextMenu is not of type MouseEvent or CustomEvent. Ignoring it. (${eventClass})`)
            options.event = null
        }

        const root: ContextMenuDivElement = document.createElement("div")
        let classes = "litegraph litecontextmenu litemenubar-panel"
        if (options.className) classes += " " + options.className
        root.className = classes
        root.style.minWidth = "100"
        root.style.minHeight = "100"
        // TODO: Fix use of timer in place of events
        root.style.pointerEvents = "none"
        setTimeout(function () {
            root.style.pointerEvents = "auto"
        }, 100) //delay so the mouse up event is not caught by this element

        //this prevents the default context browser menu to open in case this menu was created when pressing right button
        LiteGraph.pointerListenerAdd(root, "up",
            function (e: MouseEvent) {
                //console.log("pointerevents: ContextMenu up root prevent");
                e.preventDefault()
                return true
            },
            true
        )
        root.addEventListener(
            "contextmenu",
            function (e: MouseEvent) {
                if (e.button != 2) {
                    //right button
                    return false
                }
                e.preventDefault()
                return false
            },
            true
        )

        LiteGraph.pointerListenerAdd(root, "down",
            function (e: MouseEvent) {
                //console.log("pointerevents: ContextMenu down");
                if (e.button == 2) {
                    that.close()
                    e.preventDefault()
                    return true
                }
            },
            true
        )

        function on_mouse_wheel(e: WheelEvent) {
            const pos = parseInt(root.style.top)
            root.style.top =
                (pos + e.deltaY * options.scroll_speed).toFixed() + "px"
            e.preventDefault()
            return true
        }

        if (!options.scroll_speed) {
            options.scroll_speed = 0.1
        }

        root.addEventListener("wheel", on_mouse_wheel, true)

        this.root = root

        //title
        if (options.title) {
            const element = document.createElement("div")
            element.className = "litemenu-title"
            element.innerHTML = options.title
            root.appendChild(element)
        }

        //entries
        for (let i = 0; i < values.length; i++) {
            let name = values.constructor == Array ? values[i] : String(i)
            if (name != null && typeof name !== "string") {
                name = name.content === undefined ? String(name) : name.content
            }
            const value = values[i]
            // @ts-expect-error
            this.addItem(name, value, options)
        }

        //close on leave? touch enabled devices won't work TODO use a global device detector and condition on that
        /*LiteGraph.pointerListenerAdd(root,"leave", function(e) {
            console.log("pointerevents: ContextMenu leave");
            if (that.lock) {
                return;
            }
            if (root.closing_timer) {
                clearTimeout(root.closing_timer);
            }
            root.closing_timer = setTimeout(that.close.bind(that, e), 500);
            //that.close(e);
        });*/
        LiteGraph.pointerListenerAdd(root, "enter", function () {
            //console.log("pointerevents: ContextMenu enter");
            if (root.closing_timer) {
                clearTimeout(root.closing_timer)
            }
        })

        //insert before checking position
        const ownerDocument = (options.event?.target as Node).ownerDocument
        const root_document = ownerDocument || document

        if (root_document.fullscreenElement)
            root_document.fullscreenElement.appendChild(root)
        else
            root_document.body.appendChild(root)

        //compute best position
        let left = options.left || 0
        let top = options.top || 0
        if (options.event) {
            left = options.event.clientX - 10
            top = options.event.clientY - 10
            if (options.title) {
                top -= 20
            }

            if (parent) {
                const rect = parent.root.getBoundingClientRect()
                left = rect.left + rect.width
            }

            const body_rect = document.body.getBoundingClientRect()
            const root_rect = root.getBoundingClientRect()
            if (body_rect.height == 0)
                console.error("document.body height is 0. That is dangerous, set html,body { height: 100%; }")

            if (body_rect.width && left > body_rect.width - root_rect.width - 10) {
                left = body_rect.width - root_rect.width - 10
            }
            if (body_rect.height && top > body_rect.height - root_rect.height - 10) {
                top = body_rect.height - root_rect.height - 10
            }
        }

        root.style.left = left + "px"
        root.style.top = top + "px"

        if (options.scale) {
            root.style.transform = "scale(" + options.scale + ")"
        }
    }

    addItem(name: string, value: IContextMenuValue, options: IContextMenuOptions): HTMLElement {
        const that = this
        options ||= {}

        const element: ContextMenuDivElement = document.createElement("div")
        element.className = "litemenu-entry submenu"

        let disabled = false

        if (value === null) {
            element.classList.add("separator")
        } else {
            element.innerHTML = value && value.title ? value.title : name
            element.value = value
            element.setAttribute("role", "menuitem")

            if (value) {
                if (value.disabled) {
                    disabled = true
                    element.classList.add("disabled")
                    element.setAttribute("aria-disabled", "true")
                }
                if (value.submenu || value.has_submenu) {
                    element.classList.add("has_submenu")
                    element.setAttribute("aria-haspopup", "true")
                    element.setAttribute("aria-expanded", "false")
                }
            }

            if (typeof value == "function") {
                element.dataset["value"] = name
                element.onclick_callback = value
            } else {
                element.dataset["value"] = String(value)
            }

            if (value.className) {
                element.className += " " + value.className
            }
        }

        this.root.appendChild(element)
        if (!disabled) {
            element.addEventListener("click", inner_onclick)
        }
        if (!disabled && options.autoopen) {
            LiteGraph.pointerListenerAdd(element, "enter", inner_over)
        }

        function setAriaExpanded() {
            const entries = that.root.querySelectorAll("div.litemenu-entry.has_submenu")
            if (entries) {
                for (let i = 0; i < entries.length; i++) {
                    entries[i].setAttribute("aria-expanded", "false")
                }
            }
            element.setAttribute("aria-expanded", "true")
        }

        function inner_over(e) {
            const value = this.value
            if (!value || !value.has_submenu) {
                return
            }
            //if it is a submenu, autoopen like the item was clicked
            inner_onclick.call(this, e)
            setAriaExpanded()
        }

        //menu option clicked
        function inner_onclick(e) {
            const value = this.value
            let close_parent = true

            if (that.current_submenu) {
                that.current_submenu.close(e)
            }
            if (value?.has_submenu || value?.submenu) {
                setAriaExpanded()
            }

            //global callback
            if (options.callback) {
                const r = options.callback.call(
                    this,
                    value,
                    options,
                    e,
                    that,
                    options.node
                )
                if (r === true) {
                    close_parent = false
                }
            }

            //special cases
            if (value) {
                if (value.callback &&
                    !options.ignore_item_callbacks &&
                    value.disabled !== true) {
                    //item callback
                    const r = value.callback.call(
                        this,
                        value,
                        options,
                        e,
                        that,
                        options.extra
                    )
                    if (r === true) {
                        close_parent = false
                    }
                }
                if (value.submenu) {
                    if (!value.submenu.options) {
                        throw "ContextMenu submenu needs options"
                    }
                    // @ts-expect-error
                    new that.constructor(value.submenu.options, {
                        callback: value.submenu.callback,
                        event: e,
                        parentMenu: that,
                        ignore_item_callbacks: value.submenu.ignore_item_callbacks,
                        title: value.submenu.title,
                        extra: value.submenu.extra,
                        autoopen: options.autoopen
                    })
                    close_parent = false
                }
            }

            if (close_parent && !that.lock) {
                that.close()
            }
        }

        return element
    }

    close(e?: MouseEvent, ignore_parent_menu?: boolean): void {
        if (this.root.parentNode) {
            this.root.parentNode.removeChild(this.root)
        }
        if (this.parentMenu && !ignore_parent_menu) {
            this.parentMenu.lock = false
            this.parentMenu.current_submenu = null
            if (e === undefined) {
                this.parentMenu.close()
            } else if (e &&
                !ContextMenu.isCursorOverElement(e, this.parentMenu.root)) {
                ContextMenu.trigger(this.parentMenu.root, LiteGraph.pointerevents_method + "leave", e)
            }
        }
        if (this.current_submenu) {
            this.current_submenu.close(e, true)
        }

        if (this.root.closing_timer) {
            clearTimeout(this.root.closing_timer)
        }

        // TODO implement : LiteGraph.contextMenuClosed(); :: keep track of opened / closed / current ContextMenu
        // on key press, allow filtering/selecting the context menu elements
    }

    //this code is used to trigger events easily (used in the context menu mouseleave
    static trigger(element: HTMLDivElement, event_name: string, params: MouseEvent, origin?: undefined) {
        const evt = document.createEvent("CustomEvent")
        evt.initCustomEvent(event_name, true, true, params) //canBubble, cancelable, detail
        // @ts-expect-error
        evt.srcElement = origin
        if (element.dispatchEvent) {
            element.dispatchEvent(evt)
            // @ts-expect-error
        } else if (element.__events) {
            // @ts-expect-error
            element.__events.dispatchEvent(evt)
        }
        //else nothing seems binded here so nothing to do
        return evt
    }

    //returns the top most menu
    getTopMenu(): ContextMenu {
        if (this.options.parentMenu) {
            return this.options.parentMenu.getTopMenu()
        }
        return this
    }

    getFirstEvent(): MouseEvent {
        if (this.options.parentMenu) {
            return this.options.parentMenu.getFirstEvent()
        }
        return this.options.event
    }

    static isCursorOverElement(event: MouseEvent, element: HTMLDivElement): boolean {
        const left = event.clientX
        const top = event.clientY
        const rect = element.getBoundingClientRect()
        if (!rect) {
            return false
        }
        if (top > rect.top &&
            top < rect.top + rect.height &&
            left > rect.left &&
            left < rect.left + rect.width) {
            return true
        }
        return false
    }
}
