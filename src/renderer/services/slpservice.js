/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'

class SlpService {
  async getTransaction (transactionid) {
    const response = await axios
      // eslint-disable-next-line no-template-curly-in-string
      .get('https://slp.testnet.sh/api/transaction/${transactionid}')

    return response.data // .transform(response.data.Data, dateTimeFormat)
  }

  async getToken (tokenid) {
    const response = await axios
      // eslint-disable-next-line no-template-curly-in-string
      .get('hhttps://slp.testnet.sh/api/token/${tokenid}')

    return response.data // .transform(response.data.Data, dateTimeFormat)
  }

  async getTokens () {
    const response = await axios
      .get('https://slp.testnet.sh/api/tokens')

    return response.data // .transform(response.data.Data, dateTimeFormat)
  }

  async getWalletTokens (walletid) {
    const response = await axios
      // eslint-disable-next-line no-template-curly-in-string
      .get('https://slp.testnet.sh/api/address/${walletid}')

    return response.data // .transform(response.data.Data, dateTimeFormat)
  }

  async getTransactions (tokenid) {
    const response = await axios
      // eslint-disable-next-line no-template-curly-in-string
      .get('https://slp.testnet.sh/api/transactions/${tokenid}')

    return response.data // .transform(response.data.Data, dateTimeFormat)
  }

  async getAllWalletTokens (address) {
    const response = await this.getWalletTokens(address)
    const tokens = await this.getTokens()
    response.forEach(function (item) {
      tokens.forEach(function (token) {
        if (token.tokenDetails.tokenIdHex === item.tokenIdHex) {
          item.name = token.tokenDetails.name
          item.symbol = token.tokenDetails.symbol
        }
      })
    })
    return response
  }
}

export default new SlpService()
