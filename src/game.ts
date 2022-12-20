import * as eth from 'eth-connect'
import * as UI from '@dcl/ui-scene-utils'
import { getProvider } from '@decentraland/web3-provider'
import registarABI from './registar'
import controllerABI from './controller'
import MANAABI from './mana'
import { getUserAccount } from '@decentraland/EthereumController'

const cube = new Entity()
cube.addComponent(new Transform({ position: new Vector3(8, 1, 8) }))
cube.addComponent(new BoxShape())
engine.addEntity(cube)
const text = new Entity()
text.addComponent(new TextShape('Click to buy a name'))
text.addComponent(new Billboard(true))
text.getComponentOrCreate(TextShape).fontSize = 4
text.getComponentOrCreate(TextShape).color = Color3.Black()
text.getComponentOrCreate(TextShape).outlineColor = Color3.White()
text.getComponentOrCreate(TextShape).outlineWidth = 0.1
text.addComponent(
  new Transform({
    rotation: new Vector3(180).toQuaternion(),
    position: new Vector3(8, 2, 8)
  })
)
engine.addEntity(text)
cube.addComponent(
  new OnPointerDown(async () => {
    const provider = await getProvider()
    const requestManager = new eth.RequestManager(provider)
    const registar = (await new eth.ContractFactory(requestManager, registarABI).at(
      '0x2a187453064356c898cae034eaed119e1663acb8'
    )) as any
    const controller = (await new eth.ContractFactory(requestManager, controllerABI).at(
      '0x6843291bd86857d97f0d269e698939fb10d60772'
    )) as any
    const mana = (await new eth.ContractFactory(requestManager, MANAABI).at(
      '0x0f5d2fb29fb7d3cfee444a200298f468908cc942'
    )) as any

    let name = ''
    const ui = new UI.CustomPrompt(UI.PromptStyles.DARK, 400, 300)
    const title = ui.addText('Name claiming\n(100 MANA)', 0, 110)
    title.text.fontSize = 20
    const input = ui.addTextBox(0, 50, 'Name', (e) => {
      log(e, name)
      if (e !== name) {
        name = e.slice(0, 15)
        if (e.length > 15) {
          input.fillInBox.placeholder = ''
          input.fillInBox.placeholder = e.slice(0, 15)
          input.fillInBox.name = ''
          input.fillInBox.name = e.slice(0, 15)
        }
      }
    })
    const buyButton = ui.addButton(`Buy "${name}"`, 0, -100, () => {}, UI.ButtonStyles.RED)
    const notAvailButton = ui.addButton(``, 0, -100, () => {}, UI.ButtonStyles.ROUNDBLACK)
    buyButton.hide()
    buyButton.image.width = '80%'
    notAvailButton.hide()
    notAvailButton.image.width = '80%'
    const avail = ui.addButton('Check availability', 0, -40, async () => {
      if (name.length < 2) {
        notAvailButton.label.value = `"${name}" is too short`
        notAvailButton.show()
        return
      }
      const isAvail = await registar.available(name)
      log(isAvail)
      if (isAvail) {
        buyButton.label.value = `Buy "${name}"`
        buyButton.image.onClick = new OnPointerDown(async () => {
          const fromAddress = await getUserAccount()

          const allowance = await mana.allowance(fromAddress, '0x6843291bd86857d97f0d269e698939fb10d60772', {
            from: fromAddress
          })
          const allowed = new eth.BigNumber(allowance)
          if (allowed.comparedTo(eth.toWei(100, 'ether')) < 0)
            await mana.approve('0x6843291bd86857d97f0d269e698939fb10d60772', eth.toWei(100, 'ether'))
          const claim = await controller.register(name, fromAddress, { from: fromAddress })
          buyButton.label.value = `Click to see tx`
          buyButton.image.onClick = new OnPointerDown(async () => {
            openExternalURL('https://etherscan.com/tx/' + claim)
          })
        })
        buyButton.show()
        notAvailButton.hide()
      } else {
        notAvailButton.label.value = `"${name}" is not available`
        notAvailButton.show()
        buyButton.hide()
      }
    })

    avail.image.width = 200
    avail.image.height = (200 / 174) * 46
  })
)
