const hyprland = await Service.import("hyprland")
const notifications = await Service.import("notifications")
const audio = await Service.import("audio")
const battery = await Service.import("battery")
const systemtray = await Service.import("systemtray")

const date = Variable("", {
    poll: [1000, 'date "+%H:%M:%S %b %e."'],
})

// widgets can be only assigned as a child in one container
// so to make a reuseable widget, make it a function
// then you can simply instantiate one by calling it

const icons = "1234567890"
function Workspaces() {
    
    const dispatch = ws => hyprland.messageAsync(`dispatch workspace ${ws}`);

    const Workspaces = () => Widget.EventBox({
        
        onScrollUp: () => dispatch('+1'),
        onScrollDown: () => dispatch('-1'),
        child: Widget.Box({
            class_name: 'workspaces',
            children: Array.from({ length: 10 }, (_, i) => i + 1).map(i => Widget.Button({
                class_name: 'workspaces-btn',
                attribute: i,
                label: `${icons[i-1]}`,
                onClicked: () => dispatch(i),
                setup: self => self.hook(hyprland, () => {
                    self.toggleClassName("active", hyprland.active.workspace.id === i)
                    self.toggleClassName("occupied", (hyprland.getWorkspace(i)?.windows || 0) > 0)
                }),
            })),
        }),
    })

    return Workspaces()
}

function ClientTitle() {
    var title = hyprland.active.client.bind("title").as(value => {
        if (value && value.length > 40) {
            return value.substring(0, 40) + "...";
        } else {
            return value.toString();
        }
    });

    return Widget.Label({
        class_name: "client-title",
        label: title,
    });
}
function Clock() {
    return Widget.Label({
        class_name: "clock",
        label: date.bind(),
    })
}


// we don't need dunst or any other notification daemon
// because the Notifications module is a notification daemon itself
function Notification() {
    const popups = notifications.bind("popups")
    return Widget.Box({
        class_name: "notification",
        visible: popups.as(p => p.length > 0),
        children: [
            Widget.Icon({
                icon: "preferences-system-notifications-symbolic",
            }),
            Widget.Label({
                label: popups.as(p => p[0]?.summary || ""),
            }),
        ],
    })
}



function Volume() {
    const icons = {
        101: "overamplified",
        67: "high",
        34: "medium",
        1: "low",
        0: "muted",
    }

    function getIcon() {
        const icon = audio.speaker.is_muted ? 0 : [101, 67, 34, 1, 0].find(
            threshold => threshold <= audio.speaker.volume * 100)

        return `audio-volume-${icons[icon]}-symbolic`
    }

    const icon = Widget.Icon({
        icon: Utils.watch(getIcon(), audio.speaker, getIcon),
    })

    const slider = Widget.Slider({
        hexpand: true,
        draw_value: false,
        on_change: ({ value }) => audio.speaker.volume = value,
        setup: self => self.hook(audio.speaker, () => {
            self.value = audio.speaker.volume || 0
        }),
    })

    return Widget.Box({
        class_name: "volume",
        css: "min-width: 180px",
        children: [icon, slider],
    })
}


function BatteryLabel() {
    const value = battery.bind("percent").as(p => p > 0 ? p / 100 : 0)
    const icon = battery.bind("percent").as(p =>
        `battery-level-${Math.floor(p / 10) * 10}-symbolic`)

    return Widget.Box({
        class_name: "battery",
        visible: battery.bind("available"),
        children: [
            Widget.Icon({ icon }),
            Widget.LevelBar({
                widthRequest: 140,
                vpack: "center",
                value,
            }),
        ],
    })
}


function SysTray() {
    const items = systemtray.bind("items")
        .as(items => items.map(item => Widget.Button({
            child: Widget.Icon({ icon: item.bind("icon") }),
            on_primary_click: (_, event) => item.activate(event),
            on_secondary_click: (_, event) => item.openMenu(event),
            tooltip_markup: item.bind("tooltip_markup"),
        })))

    return Widget.Box({
        children: items,
    })
}
function Home() {
    return Widget.Button({
        class_name: "home",

        child: Widget.Label(' '
    ),
        onClicked: () => Utils.execAsync([
         "ags", "-t", "window-name"
        ]),
    })
} 

// layout of the bar
function Left() {
    return Widget.Box({
        spacing: 8,
        children: [
            Home(),
            Workspaces(),
            ClientTitle(),
        ],
    })
}

function Center() {
    return Widget.Box({
        spacing: 8,
        children: [
            Clock(),
            Notification(),
        ],
    })
}

function Right() {
    return Widget.Box({
        hpack: "end",
        spacing: 8,
        children: [
            Volume(),
            BatteryLabel(),
            Clock(),
            SysTray(),
        ],
    })
}

function Bar(monitor = 0) {
    return Widget.Window({
        name: `bar-${monitor}`, // name has to be unique
        class_name: "bar",
        monitor,
        margins: [5, 10],
        anchor: ["top", "left", "right"],
        exclusivity: "exclusive",
        child: Widget.CenterBox({
            start_widget: Left(),
            center_widget: Center(),
            end_widget: Right(),
        }),
    })
}
const scss = `${App.configDir}/style.scss`
const css = `${App.configDir}/style.css`
Utils.exec(`sassc ${scss} ${css}`)

const myBar = Widget.Window({
    name: 'window-name',
    class_name: 'window-name',
    anchor: ['top', 'right'],
    exclusivity: 'normal',
    layer: 'top',
    margins: [20, 20, 0, 0],
    monitor: 0,
    child: Widget.Label('hello'),
})

App.config({
    style: css,
    windows: [
        Bar(0),
        Bar(1),
        myBar
        // you can call it, for each monitor
        // Bar(0),
        // Bar(1)
    ],
})

export { }