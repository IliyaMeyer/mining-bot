const mineflayer = require('mineflayer')
const v = require("vec3");

const X = 'x', Y = 'y', Z = 'z'
const hoverHeight = 74
const corners = {
    bottomLeft: {
        x: 1880.5,
        z: -2263.5
    },
    topRight: {
        x: 1806.5,
        z: -2189.5
    }
} // bottom left and top right corners
const currentColumn = {
    x: corners.topRight.x,
    z: corners.topRight.z
}
let pastPosition = null

const getBotPosition = (cord) => {
    switch (cord) {
        case X: return bot.entity.position.x
        case Y: return bot.entity.position.y
        case Z: return bot.entity.position.z
    }
} // returns the respective cord
const getCenter = () => {
    return {
        x: (corners.bottomLeft.x + corners.topRight.x) / 2,
        z: (corners.bottomLeft.z + corners.topRight.z) / 2
    }
} // returns cords for the center of the mine
const getBlockBelow = () => {
    let yDisplacement = 1
    const botPosition = bot.entity.position
    if (bot.blockAt(v(botPosition.x, botPosition.y - yDisplacement, botPosition.z)) === null) {
        console.log('=-=-=-=-=-=-= COULD NOT GET BLOCK BELOW')
        process.exit()
        //return getBlockBelow()
    }
    while (
        bot.blockAt(v(botPosition.x, botPosition.y - yDisplacement, botPosition.z)).type
        === 0
        ) {
        yDisplacement++
        if (bot.blockAt(v(botPosition.x, botPosition.y - yDisplacement, botPosition.z)) === null)
            return getBlockBelow()
    }
    return bot.blockAt(v(botPosition.x, botPosition.y - yDisplacement, botPosition.z))
} // returns the block below the bot
const isInSquare = (x, z) => {
    let xArray = [x, corners.bottomLeft.x, corners.topRight.x]
    xArray.sort()
    let zArray = [z, corners.bottomLeft.z, corners.topRight.z]
    zArray.sort()
    return xArray[1] === x && zArray[1] === z
} // determines if the position is in the mine square
const updateColumn = () => {
    currentColumn.x++
    if (currentColumn.x === corners.bottomLeft.x + 1) {
        currentColumn.x = corners.topRight.x
        currentColumn.z--
        if (currentColumn.z > getCenter().z + 5)
            currentColumn.z = corners.topRight.z
    }
    // check that the column isn't empty
    let currentBlock = bot.blockAt(v(currentColumn.x, hoverHeight, currentColumn.z))
    let yDisplacement = 0
    while (currentBlock.name !== 'bedrock') {
        //console.log(currentBlock.name, currentBlock.position.y)
        yDisplacement++
        currentBlock = bot.blockAt(v(currentColumn.x, hoverHeight - yDisplacement, currentColumn.z))
        if (currentBlock.name !== 'air' && currentBlock.name !== 'bedrock')
            return
    }
    updateColumn()
} // change the current column to the next one

const options = {
    host: 'buzz.brutalprison.com',
    //port: 44855,
    username: 'email',
    password: 'password'
}
const bot = mineflayer.createBot(options)

// enter the mine and fly to hover height
const enterMine = async () => {

    // bot teleports to the mine
    return new Promise((resolve) => {
        bot.chat('/warp r')
        setTimeout(() => {
            resolve('teleported to mine')
        }, 1000)
    })

        // bot looks at the mine
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                const center = getCenter()
                bot.lookAt(v(center.x, hoverHeight, center.z))
                    .then(() => {
                        resolve('looking at mine')
                    })
            })
        })

        // bot walks forward into the mine
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                const onMove = () => {
                    if (isInSquare(getBotPosition(X), getBotPosition(Z))) {
                        bot.removeListener('move', onMove)
                        bot.setControlState('forward', false)
                        resolve('entered mine')
                    }
                }
                bot.setControlState('forward', true)
                bot.on('move', onMove)
            })
        })

        // bot flies
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                bot.creative.flyTo(v(getBotPosition(X), hoverHeight, getBotPosition(Z)), () => {
                    resolve('in flight position')
                })
            })
        })

        // end the process
        .then((message) => {
            console.log(message)
            return 'mine entry complete -----'
        })

}

// fly to the current column
const hoverCurrentColumn = async () => {

    const destination = v(currentColumn.x, hoverHeight, currentColumn.z)

    // look at the column
    return new Promise((resolve) => {
        setTimeout(() => {
            bot.lookAt(destination).then(() => {
                resolve('looking at column')
            })
        }, 5)
    })

        // fly to the column
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                setTimeout(() => {
                    bot.creative.flyTo(destination, () => {
                        resolve('hovering over column')
                    })
                }, 5)
            })
        })

        // end the process
        .then((message) => {
            console.log(message)
            return 'now hovering over current column -----'
        })

}

// fly to and mine the column below the player
const mineColumn = async () => {

    // check if the column is empty
    if (getBlockBelow().name === 'bedrock') {
        console.log('column is empty')
        updateColumn()
        return ''
    }

    // hold pickaxe
    return new Promise((resolve) => {
        setTimeout(() => {
            bot.setQuickBarSlot(0)
            resolve('pickaxe selected')
        }, 500)
    })

        // look down at the column
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                bot.lookAt(getBlockBelow().position).then(() => {
                    resolve('looking at column')
                })
            })
        })

        // check that the bot is directly over the column
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                if (!vectorEqual(bot.entity.position, currentColumn))
                    hoverCurrentColumn().then(() => {
                        resolve('bot center over square after adjustment')
                    })
                else
                    resolve('bot center over square')
            })
        })

        // stop flying
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                bot.creative.stopFlying()
                resolve('dropping')
            })
        })

        // mine blocks below
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                const mineBlockBelow = () => {
                    const mineBlock = getBlockBelow()
                    let delay = 100
                    if (getBlockBelow().name === 'bedrock')
                        resolve('column has been mined')
                    setTimeout(() => {
                        if (mineBlock !== null &&
                            bot.canDigBlock(mineBlock) &&
                            bot.canSeeBlock(mineBlock)) {
                            bot.dig(mineBlock, true, () => {}).then(() => {
                                mineBlockBelow()
                            })
                        }
                        else
                            mineBlockBelow()
                    }, delay)
                }
                mineBlockBelow()
            })
        })

        // rise to the surface
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                setTimeout(() => {
                    bot.creative.flyTo(v(getBotPosition(X), hoverHeight, getBotPosition(Z)), () => {
                        resolve('in flight position')
                    })
                }, 500)
            })
        })

        // collect tokens
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                collectTokens().then(() => {
                    resolve('tokens collected')
                })
            })
        })

        .then((message) => {
            console.log(message)
            updateColumn()
            return 'column mining complete -----'
        })

}

// sell all the blocks in the inventory
const sellBlocks = async () => {

    // fly to magma cube
    return new Promise((resolve) => {
        setTimeout(() => {
            const center = getCenter()
            const centerVector = v(center.x, hoverHeight, center.z)
            bot.lookAt(centerVector)
            bot.creative.flyTo(centerVector, () => {
                resolve('at magma cube')
            })
        }, 500)
    })

        // sell to magma cube
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                setTimeout(() => {
                    bot.activateEntity(
                        bot.nearestEntity(entity => entity.name.toLowerCase() === 'magma_cube'),
                        () => {
                            resolve('items sold')
                        }
                    )}, 500)
            })
        })

        // end the process
        .then((message) => {
            console.log(message)
            return 'sell process complete -----'
        })

}

// collect tokens from token backpack
const collectTokens = async () => {

    // hold token backpack
    return new Promise((resolve) => {
        setTimeout(() => {
            bot.setQuickBarSlot(1)
            resolve('token backpack selected')
        }, 50)
    })

        // open the menu and collect tokens
        .then((message) => {
            console.log(message)
            return new Promise((resolve) => {
                const onWindowOpen = (window) => {
                    setTimeout(() => {
                        bot.clickWindow(13, 1, 0, () => {
                            bot.closeWindow(window)
                            bot.setQuickBarSlot(0)
                            bot.chat('/tokens show')
                            resolve('tokens collected')
                        })
                    }, 50)
                }
                bot.once('windowOpen', onWindowOpen)
                setTimeout(() => {
                    bot.activateItem(false)
                }, 50)
            })
        })

        // end the process
        .then((message) => {
            console.log(message)
            return 'collect token process complete -----'
        })

}

const executeOperations = () => {
    if (bot.inventory.emptySlotCount() === 0) {
        sellBlocks().then(collectTokens).then(executeOperations)
    }
    else
        hoverCurrentColumn().then(mineColumn).then(executeOperations)
}

const onJoin = () => {
    setTimeout(() => {
        enterMine().then(executeOperations)
    }, 1000)
}

bot.once('spawn', onJoin)

const printMessage = (name, message) => {
    const currentTime = new Date()
    const time = currentTime.getHours() + ':' + currentTime.getMinutes() + ':' + currentTime.getSeconds()
    console.log('SERVER MESSAGE', time, ':', message)
}
bot.on('chat', printMessage)

const onAbortDigging = (error) => {
    console.log('error')
    bot.stopDigging()
}

const onError = (error) => {
    console.log('ERROR ERROR:', error)
}
bot.on('error', onError)

const vectorEqual = (v1, v2) => {
    return (v1.x === v2.x && v1.y === v2.y && v1.z === v2.z)
}

const roundPositions = (vector) => {
    vector.x = Math.floor(vector.x)
    vector.y = Math.floor(vector.y)
    vector.z = Math.floor(vector.z)
    return vector
}

const idleCheck = () => {
    if (pastPosition === null)
        pastPosition = {
            x: getBotPosition(X),
            y: getBotPosition(Y),
            z: getBotPosition(Z)
        }
    else if (vectorEqual(roundPositions(bot.entity.position), roundPositions(pastPosition))) {
        console.log('bot idle, restarting script')
        process.exit()
    } else
        pastPosition = {
            x: getBotPosition(X),
            y: getBotPosition(Y),
            z: getBotPosition(Z)
        }
}

setInterval(() => {
    idleCheck()
}, 5000)
