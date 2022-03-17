const http = require('http');
const express = require('express');
const app = express();
const cors = require("cors")
const { nanoid } = require("nanoid")

const PORT = process.env.PORT || 8080

// app.use(cors())
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: '*',
    }
}
);


// io.set("origins", "*:*");


/**
 * Socket middleware
 */
// io.use((socket, next) => {
//     console.log("token: ", socket.handshake.auth?.token);
//     next()
// })

const init_list = [
    {
        index: 0,
        is_selected: false,
        selected_by: ""
    },
    {
        index: 1,
        is_selected: false,
        selected_by: ""
    },
    {
        index: 2,
        is_selected: false,
        selected_by: ""
    },
    {
        index: 3,
        is_selected: false,
        selected_by: ""
    },
    {
        index: 4,
        is_selected: false,
        selected_by: ""
    },
    {
        index: 5,
        is_selected: false,
        selected_by: ""
    },
    {
        index: 6,
        is_selected: false,
        selected_by: ""
    },
    {
        index: 7,
        is_selected: false,
        selected_by: ""
    },
    {
        index: 8,
        is_selected: false,
        selected_by: ""
    },

]

const DATA = {
    rooms: []
}


io
    .on('connection', (socket) => {
        console.log('connected......');

        ////////////////////////////////////////////////////////
        /////  SOCKET OPERATION  //////////////////////////////
        //////////////////////////////////////////////////////

        /**
         * 
         * Incomming Events [ socket.on() ] 
         * 
         */

        socket.on("createRoom", (data, callback) => {
            // console.log({ data });
            const user_id = nanoid(5)
            const room_id = nanoid(10)
            const room_info = {
                room_id: room_id,
                list: init_list,
                user1: {
                    id: user_id,
                    name: data?.name || "User 1",
                },
                user2: null,
                selected_user: user_id,
                last_selected_user: user_id
            }

            socket.join(room_id)
            DATA.rooms.push(room_info)
            callback({ room: room_info, user: user_id })
        })


        socket.on("joinRoom", (data, callback) => {
            // console.log(DATA.rooms.length);
            const selected_room = DATA?.rooms?.filter?.(rm => rm.room_id === data?.room_id)?.[0]
            if (!selected_room) return callback(false)
            // if (selected_room?.user2?.id) return callback(false)

            console.log("selected room: ", selected_room?.room_id);


            const user_id = nanoid(6)
            selected_room_info = {
                ...selected_room,
                user2: {
                    id: user_id,
                    name: data?.name
                }
            }

            let arr = []
            DATA.rooms.forEach(rm => {
                if (rm.room_id === data?.room_id) {
                    arr.push(selected_room_info)
                } else {
                    arr.push(rm)
                }
            })
            DATA.rooms = [...arr]

            // console.log({ selected_room_info });
            socket.join(data?.room_id)

            io
                .to(data?.room_id)
                .emit("someone-joined", selected_room_info)
            callback({ room: selected_room_info, user: user_id })
        })


        socket.on("move-click", ({ room_id, move_info }, callback) => {

            let selected_room = DATA?.rooms?.filter?.(rm => rm.room_id === room_id)?.[0]
            if (!selected_room) return callback(false)
            if (selected_room?.users?.user2?.id) return callback(false)

            // console.log("selected room: ", selected_room?.room_id);

            let list = []
            selected_room?.list?.forEach?.(item => {

                if (item?.index == move_info?.index) {
                    list.push({ ...item, is_selected: true, selected_by: selected_room?.selected_user })
                }
                else {
                    list.push(item)
                }
            })
            selected_room.list = list
            selected_room.last_selected_user = selected_room?.selected_user
            selected_room.selected_user =
                selected_room?.selected_user == selected_room?.user1?.id ?
                    selected_room?.user2?.id : selected_room?.user1?.id


            let arr = []
            DATA.rooms.forEach(rm => {
                if (rm.room_id === room_id) {
                    arr.push({ ...selected_room })
                } else {
                    arr.push(rm)
                }
            })
            DATA.rooms = [...arr]

            console.log({ user1: selected_room.user1, user2: selected_room.user2 });


            // emit to all the user in this room expect sender
            socket
                .broadcast
                .to(selected_room.room_id)
                .emit("move-click-update", { room: selected_room })
            callback({ room: selected_room })


            /// calculate
            const result = handleCalculate(selected_room.list, selected_room.last_selected_user)
            if (result === false) return
            setTimeout(()=>{
                io.to(room_id)
                .emit("result", result)

                const reset_list =  handleResetList(room_id)
                io.to(room_id)
                .emit("reset-list", reset_list)

            }, 200)

        })


        const handleResetList =(room_id)=>{
            let arr = []
            DATA.rooms.forEach(rm => {
                if (rm.room_id === room_id) {
                    arr.push({ ...rm, list: init_list })
                } else {
                    arr.push(rm)
                }
            })
            DATA.rooms = [...arr]

            console.log("reset_done");
            return DATA.rooms.filter(r => r.room_id == room_id)?.[0]?.list

        }


        // socket.on("calculate", ({ list, user, room_id }, callback) => {

        //     if (!list || !user || !room_id) return callback(false)
        //     const result = handleCalculate(list, user)

        //     io.to(room_id)
        //         .emit("result", result)
        //     callback(result)
        // })


        // on game movement
        const handleCalculate = (list, user) => {
            console.log("calculating.....");
            /**
             *   0 1 2
             *   3 4 5
             *   6 7 8 
             */

            const is_full = list?.filter(d => d?.is_selected)?.length === list?.length

            if (is_full) {
                return true
            }


            ///////////////////////////////////////////////////////////
            // 0-1-2
            if (
                list?.[0]?.is_selected && list?.[0]?.selected_by == user &&
                list?.[1]?.is_selected && list?.[1]?.selected_by == user &&
                list?.[2]?.is_selected && list?.[2]?.selected_by == user
            ) {
                // console.log("winer", user);
                return user
            }

            // 3-4-5
            else if (
                list?.[3]?.is_selected && list?.[3]?.selected_by == user &&
                list?.[4]?.is_selected && list?.[4]?.selected_by == user &&
                list?.[5]?.is_selected && list?.[5]?.selected_by == user
            ) {
                // console.log("winer", user);
                return user
            }

            // 6-7-8
            else if (
                list?.[6]?.is_selected && list?.[6]?.selected_by == user &&
                list?.[7]?.is_selected && list?.[7]?.selected_by == user &&
                list?.[8]?.is_selected && list?.[8]?.selected_by == user
            ) {
                // console.log("winer", user);
                return user
            }

            /**
             * 0
             * 3
             * 6
             */
            else if (
                list?.[0]?.is_selected && list?.[0]?.selected_by == user &&
                list?.[3]?.is_selected && list?.[3]?.selected_by == user &&
                list?.[6]?.is_selected && list?.[6]?.selected_by == user
            ) {
                // console.log("winer", user);
                return user
            }

            /**
             * 1
             * 4
             * 7
             */
            else if (
                list?.[1]?.is_selected && list?.[1]?.selected_by == user &&
                list?.[4]?.is_selected && list?.[4]?.selected_by == user &&
                list?.[7]?.is_selected && list?.[7]?.selected_by == user
            ) {
                // console.log("winer", user);
                return user
            }

            /**
             * 2
             * 5
             * 8
             */
            else if (
                list?.[2]?.is_selected && list?.[2]?.selected_by == user &&
                list?.[5]?.is_selected && list?.[5]?.selected_by == user &&
                list?.[8]?.is_selected && list?.[8]?.selected_by == user
            ) {
                // console.log("winer", user);
                return user
            }





            /**
            * 0
            *   4
            *     8
            */
            else if (
                list?.[0]?.is_selected && list?.[0]?.selected_by == user &&
                list?.[4]?.is_selected && list?.[4]?.selected_by == user &&
                list?.[8]?.is_selected && list?.[8]?.selected_by == user
            ) {
                // console.log("winer", user);
                return user
            }

            /**
             *    2
             *  4
             * 6
             */
            else if (
                list?.[1]?.is_selected && list?.[1]?.selected_by == user &&
                list?.[4]?.is_selected && list?.[4]?.selected_by == user &&
                list?.[7]?.is_selected && list?.[7]?.selected_by == user
            ) {
                // console.log("winer", user);
                return user
            }


            return false


        }




        /**
         * 
         * Triger Events [ socket.emit() ] 
         * 
         */


    });

server.listen(PORT, () => {
    console.log(`server running::PORT:`, PORT);
});