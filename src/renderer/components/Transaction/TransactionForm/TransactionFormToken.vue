<template>
  <form
    class="flex flex-col"
    @submit.prevent
  >
    <ListDivided
      v-if="senderLabel"
      :is-floating-label="true"
    >
      <ListDividedItem :label="$t('TRANSACTION.SENDER')">
        {{ senderLabel }}
        <span
          v-if="senderLabel !== currentWallet.address"
          class="text-sm text-theme-page-text-light"
        >
          {{ currentWallet.address }}
        </span>
        {{ formatter_networkCurrency(currentWallet.balance) }}
      </ListDividedItem>
    </ListDivided>

    <InputSelect
      ref="slptype"
      v-model="$v.slp.type.$model"
      :items="slp1types"
      :label="$t('SLP.TRANSACTION.TYPE')"
      :is-invalid="$v.slp.type.$error"
      :helper-text="$t('SLP.TRANSACTION.TYPEHELPER')"
      name="slptype"
      class="flex-1"
    />

    <InputSelect
      v-if="ifSlpTypeNotGenesis"
      ref="tokenID"
      v-model="$v.slp.tokenID.$model"
      :items="slp1tokenIDs"
      :label="$t('SLP.TRANSACTION.TOKENLABEL')"
      :is-invalid="$v.slp.tokenID.$error"
      name="tokenID"
      class="flex-1"
    />

    <InputText
      v-if="slp.type === 'GENESIS'"
      ref="tokenName"
      v-model="$v.slp.tokenName.$model"
      :label="$t('SLP.TRANSACTION.TOKENNAME')"
      :helper-text="$t('SLP.TRANSACTION.TOKENNAMEHELPER')"
      :is-invalid="$v.slp.tokenName.$error"
      name="tokenName"
    />

    <InputText
      v-if="slp.type === 'GENESIS'"
      ref="tokenSymbol"
      v-model="$v.slp.tokenSymbol.$model"
      :label="$t('SLP.TRANSACTION.SYMBOL')"
      :helper-text="$t('SLP.TRANSACTION.SYMBOLHELPER')"
      :is-invalid="$v.slp.tokenSymbol.$error"
      name="tokenSymbol"
    />

    <InputText
      v-if="ifSlpTypeNeedAmount"
      ref="tokenAmount"
      v-model="$v.slp.tokenAmount.$model"
      :label="$t('SLP.TRANSACTION.AMOUNT')"
      :helper-text="$t('SLP.TRANSACTION.AMOUNTHELPER')"
      :is-invalid="$v.slp.tokenAmount.$error"
      name="tokenAmount"
      class="mb-2"
    />

    <InputText
      v-if="ifSlpTypeGenesis"
      ref="tokenDecimals"
      v-model="$v.slp.tokenDecimals.$model"
      :label="$t('SLP.TRANSACTION.DECIMALS')"
      :helper-text="$t('SLP.TRANSACTION.DECIMALSHELPER')"
      :is-invalid="$v.slp.tokenDecimals.$error"
      name="tokenDecimals"
      class="mb-2"
    />

    <InputText
      v-if="ifSlpTypeGenesis"
      ref="tokenURI"
      v-model="$v.slp.tokenURI.$model"
      :label="$t('SLP.TRANSACTION.URI')"
      :helper-text="$t('SLP.TRANSACTION.URIHELPER')"
      :is-invalid="$v.slp.tokenURI.$error"
      name="tokenURI"
      class="mb-2"
    />

    <InputText
      ref="tokenNote"
      v-model="$v.slp.tokenNote.$model"
      :label="$t('SLP.TRANSACTION.NOTELABEL')"
      :helper-text="$t('SLP.TRANSACTION.NOTELABELHELPER')"
      :is-invalid="$v.slp.tokenNote.$error"
      name="tokenNote"
      class="mb-2"
    />

    <InputAddress
      v-if="ifSlpTypeSend"
      ref="recipient"
      v-model="$v.form.recipientId.$model"
      :label="$t('TRANSACTION.RECIPIENT')"
      :pub-key-hash="walletNetwork.version"
      :show-suggestions="true"
      :is-disabled="!currentWallet"
      name="recipientId"
      class="mb-2"
    />

    <div
      v-if="currentWallet && currentWallet.isLedger"
      class="mt-3"
    >
      {{ $t('TRANSACTION.LEDGER_SIGN_NOTICE') }}
    </div>
    <InputPassword
      v-else-if="currentWallet && currentWallet.passphrase"
      ref="password"
      v-model="$v.form.walletPassword.$model"
      class="mt-4"
      :label="$t('TRANSACTION.PASSWORD')"
      :is-required="true"
    />
    <PassphraseInput
      v-else
      ref="passphrase"
      v-model="$v.form.passphrase.$model"
      class="mt-4"
      :address="currentWallet && currentWallet.address"
      :pub-key-hash="walletNetwork.version"
      :is-disabled="!currentWallet"
    />

    <PassphraseInput
      v-if="currentWallet && currentWallet.secondPublicKey"
      ref="secondPassphrase"
      v-model="$v.form.secondPassphrase.$model"
      :label="$t('TRANSACTION.SECOND_PASSPHRASE')"
      :pub-key-hash="walletNetwork.version"
      :public-key="currentWallet.secondPublicKey"
      class="mt-5"
    />

    <div class="self-start">
      <button
        :disabled="$v.form.$invalid || $v.slp.$invalid || notEnoughXQR"
        class="blue-button mt-10"
        @click="onSubmit"
      >
        {{ $t('COMMON.NEXT') }}
      </button>
    </div>

    <ModalConfirmation
      v-if="showConfirmSendAll"
      :question="$t('TRANSACTION.CONFIRM_SEND_ALL')"
      :title="$t('TRANSACTION.CONFIRM_SEND_ALL_TITLE')"
      :note="$t('TRANSACTION.CONFIRM_SEND_ALL_NOTE')"
      container-classes="SendAllConfirmation"
      portal-target="loading"
      @close="emitCancelSendAll"
      @cancel="emitCancelSendAll"
      @continue="enableSendAll"
    />
    <ModalLoader
      :message="$t('ENCRYPTION.DECRYPTING')"
      :visible="showEncryptLoader"
    />
    <ModalLoader
      :message="$t('TRANSACTION.LEDGER_SIGN_WAIT')"
      :visible="showLedgerLoader"
    />
  </form>
</template>

<script>
/* eslint-disable */
import {
  decimal,
  alphaNum,
  required,
  requiredIf,
  numeric,
  between,
  maxLength,
  minLength,
  url
} from 'vuelidate/lib/validators'
import { SLP1, TRANSACTION_TYPES } from '@config'
import {
  InputAddress,
  InputPassword,
  InputText,
  InputSelect
} from '@/components/Input'
import { ModalConfirmation, ModalLoader } from '@/components/Modal'
import { PassphraseInput } from '@/components/Passphrase'
import TransactionService from '@/services/transaction'
import onSubmit from './mixin'
import SlpService from '@/services/slpservice'
import { ListDivided, ListDividedItem } from '@/components/ListDivided'

export default {
  name: 'TransactionFormToken',

  transactionType: TRANSACTION_TYPES.GROUP_1.TOKEN,

  components: {
    InputAddress,
    InputPassword,
    InputSelect,
    InputText,
    ListDivided,
    ListDividedItem,
    ModalConfirmation,
    ModalLoader,
    PassphraseInput
  },

  mixins: [onSubmit],

  props: {
    schema: {
      type: Object,
      required: false,
      default: () => {}
    }
  },

  data: vm => ({
    form: {
      amount: 0.00000001,
      fee: 0.02,
      passphrase: '',
      walletPassword: '',
      recipientId: '',
      vendorField: ''
    },
    slp: {
      type: '',
      tokenID: '',
      tokenURI: '',
      tokenNote: '',
      tokenName: '',
      tokenSymbol: '',
      tokenAmount: '',
      tokenDecimals: 8
    },
    slpWallet: 'QjeTQp29p9xRvTcoox4chc6jQZAHwq87JC',
    tokens: [],
    isSendAllActive: false,
    showEncryptLoader: false,
    showLedgerLoader: false,
    previousAmount: '',
    wallet: null,
    showConfirmSendAll: false
  }),

  computed: {
    notEnoughXQR() {
      return (
        parseInt(this.currency_unitToSub(this.form.amount)) +
          parseInt(this.currency_unitToSub(this.form.fee)) >
        parseInt(this.currentWallet.balance)
      )
    },
    ifSlpTypeNeedAmount() {
      return (
        this.slp.type === 'SEND' ||
        this.slp.type === 'BURN' ||
        this.slp.type === 'GENESIS'
      )
    },
    ifSlpTypeSend() {
      return this.slp.type === 'SEND'
    },
    ifSlpTypeNotGenesis() {
      return this.slp.type !== 'GENESIS'
    },
    ifSlpTypeGenesis() {
      return this.slp.type === 'GENESIS'
    },
    slp1tokenIDs() {
      return this.tokens.reduce((all, token) => {
        all[token.tokenIdHex] =
          token.symbol +
          ' - ' +
          this.currency_decimals(token.tokenBalance, token.tokenDecimals) +
          ' : ' +
          token.tokenIdHex
        return all
      }, {})
    },
    slp1types() {
      return SLP1.types.reduce((all, type) => {
        all[type] = this.$t(`SLP1_TYPES.${type}`)
        return all
      }, {})
    },
    alternativeCurrency() {
      return this.$store.getters['session/currency']
    },
    // Customize the message to display the minimum amount as subunit
    amountTooLowError() {
      const { fractionDigits } = this.walletNetwork
      const minimumAmount = Math.pow(10, -fractionDigits)
      const amount = this.currency_simpleFormatCrypto(
        minimumAmount.toFixed(fractionDigits)
      )
      return this.$t('INPUT_CURRENCY.ERROR.LESS_THAN_MINIMUM', { amount })
    },
    notEnoughBalanceError() {
      if (!this.currentWallet) {
        return ''
      }
      const balance = this.formatter_networkCurrency(this.currentWallet.balance)
      return this.$t('TRANSACTION_FORM.ERROR.NOT_ENOUGH_BALANCE', { balance })
    },
    minimumAmount() {
      return this.currency_subToUnit(1)
    },
    maximumAvailableAmount() {
      if (!this.currentWallet) {
        return 0
      }
      return this.currency_subToUnit(this.currentWallet.balance).minus(
        this.form.fee
      )
    },
    senderLabel() {
      return this.currentWallet
        ? this.wallet_formatAddress(this.currentWallet.address)
        : null
    },
    senderWallet() {
      return this.wallet
    },
    walletNetwork() {
      const sessionNetwork = this.session_network
      if (!this.currentWallet || !this.currentWallet.id) {
        return sessionNetwork
      }

      const profile = this.$store.getters['profile/byId'](
        this.currentWallet.profileId
      )
      if (!profile.id) {
        return sessionNetwork
      }
      return (
        this.$store.getters['network/byId'](profile.networkId) || sessionNetwork
      )
    },
    currentWallet: {
      get() {
        return this.senderWallet || this.wallet_fromRoute
      },
      set(wallet) {
        this.wallet = wallet
      }
    }
  },
  watch: {
    slp: {
      handler: function() {
        this.slpjson()
      },
      deep: true
    },
    wallet() {
      this.ensureAvailableAmount()
      this.$v.form.recipientId.$touch()
      this.pullTokens()
    }
  },

  mounted() {
    // Note: we set this here and not in the data property so validation is triggered properly when fields get pre-populated
    if (this.schema) {
      this.$set(this.form, 'amount', this.schema.amount || '')
      this.$set(this.form, 'recipientId', this.schema.address || '')
    }
    if (this.currentWallet && this.currentWallet.id) {
      this.$set(this, 'wallet', this.currentWallet || null)
      this.$v.wallet.$touch()
    }
  },

  methods: {
    slpjson() {
      let jsontemplate
      if (this.ifSlpTypeGenesis) {
        this.form.amount = 1000
        let rawquantity = this.currency_unitToSub(this.slp.tokenAmount, {
          fractionDigits: this.slp.tokenDecimals
        })
        jsontemplate = {
          slp1: {
            tp: this.slp.type,
            na: this.slp.tokenName,
            sy: this.slp.tokenSymbol,
            de: this.slp.tokenDecimals.toString(),
            qt: rawquantity,
            du: this.slp.tokenURI,
            no: this.slp.tokenNote
          }
        }
      } else {
        this.form.amount = 0.00000001
        if (!this.slp.tokenID) {
          return
        }
        let decimals = this.tokens.find(
          token => token.tokenIdHex === this.slp.tokenID
        ).tokenDecimals
        let rawquantity = this.currency_unitToSub(this.slp.tokenAmount, {
          fractionDigits: decimals
        })
        jsontemplate = {
          slp1: {
            tp: this.slp.type,
            id: this.slp.tokenID,
            qt: rawquantity,
            no: this.slp.tokenNote
          }
        }
      }
      this.form.vendorField = JSON.stringify(jsontemplate, null, 1)
    },

    pullTokens() {
      SlpService.getAllWalletTokens(this.currentWallet.address).then(
        result => {
          this.tokens = result
        }
      )
    },

    emitNext(transaction) {
      this.$emit('next', {
        transaction,
        wallet: this.senderWallet
      })
    },

    onFee(fee) {
      this.$set(this.form, 'fee', fee)
      this.ensureAvailableAmount()
    },
    setSendAll(isActive, setPreviousAmount = true) {
      if (isActive) {
        this.confirmSendAll()
        this.previousAmount = this.form['amount']
      }
      if (!isActive) {
        if (
          setPreviousAmount &&
          !this.previousAmount &&
          this.previousAmount.length
        ) {
          this.$set(this.form, 'amount', this.previousAmount)
        }
        this.previousAmount = ''
        this.isSendAllActive = isActive
        this.ensureAvailableAmount()
      }
    },

    canSendAll() {
      return this.maximumAvailableAmount > 0
    },

    ensureAvailableAmount() {
      if (this.isSendAllActive && this.canSendAll()) {
        this.$set(this.form, 'amount', this.maximumAvailableAmount)
      }
    },
    async submit() {
      const transactionData = {
        amount: this.currency_unitToSub(this.form.amount),
        recipientId: this.ifSlpTypeSend
          ? this.form.recipientId
          : this.slpWallet,
        vendorField: this.form.vendorField,
        passphrase: this.form.passphrase,
        fee: this.currency_unitToSub(this.form.fee),
        wif: this.form.wif,
        networkWif: this.walletNetwork.wif
      }

      if (this.currentWallet.secondPublicKey) {
        transactionData.secondPassphrase = this.form.secondPassphrase
      }

      let success = true
      let transaction
      if (!this.currentWallet || !this.currentWallet.isLedger) {
        transaction = await this.$client.buildTransfer(
          transactionData,
          this.$refs.fee && this.$refs.fee.isAdvancedFee
        )
      } else {
        success = false
        this.showLedgerLoader = true
        try {
          const transactionObject = await this.$client.buildTransfer(
            transactionData,
            this.$refs.fee && this.$refs.fee.isAdvancedFee,
            true
          )
          transaction = await TransactionService.ledgerSign(
            this.currentWallet,
            transactionObject,
            this
          )
          success = true
        } catch (error) {
          this.$error(
            `${this.$t('TRANSACTION.LEDGER_SIGN_FAILED')}: ${error.message}`
          )
        }
        this.showLedgerLoader = false
      }

      if (success) {
        this.emitNext(transaction)
      }
    },

    enableSendAll() {
      this.isSendAllActive = true
      this.ensureAvailableAmount()
      this.showConfirmSendAll = false
    },

    confirmSendAll() {
      this.showConfirmSendAll = true
    },

    emitCancelSendAll() {
      this.showConfirmSendAll = false
      this.isSendAllActive = false
    }
  },

  validations: {
    wallet: {},
    slp: {
      tokenURI: {
        url,
        maxLength: maxLength(32)
      },
      tokenNote: {
        maxLength: maxLength(32)
      },
      tokenAmount: {
        required,
        decimal
      },
      tokenID: {
        requiredIf: requiredIf(function(form) {
          return this.ifSlpTypeNotGenesis
        })
      },
      tokenDecimals: {
        requiredIf: requiredIf(function(form) {
          return this.ifSlpTypeGenesis
        }),
        numeric,
        between: between(0, 8)
      },
      tokenName: {
        requiredIf: requiredIf(function(form) {
          return this.ifSlpTypeGenesis
        }),
        minLength: minLength(3),
        maxLength: maxLength(24)
      },
      tokenSymbol: {
        requiredIf: requiredIf(function(form) {
          return this.ifSlpTypeGenesis
        }),
        alphaNum,
        minLength: minLength(3),
        maxLength: maxLength(8)
      },
      type: {
        required,
        isValid(value) {
          if (this.notEnoughXQR) {
            return false
          }
          return true
        }
      }
    },
    form: {
      recipientId: {
        requiredIf: requiredIf(function(form) {
          return this.ifSlpTypeSend
        })
      },
      amount: {
        required
      },
      fee: {
        required
      },
      passphrase: {
        isValid(value) {
          if (this.currentWallet.isLedger || this.currentWallet.passphrase) {
            return true
          }

          if (this.$refs.passphrase) {
            return !this.$refs.passphrase.$v.$invalid
          }

          return false
        }
      },
      walletPassword: {
        isValid(value) {
          if (this.currentWallet.isLedger || !this.currentWallet.passphrase) {
            return true
          }

          if (!this.form.walletPassword || !this.form.walletPassword.length) {
            return false
          }

          if (this.$refs.password) {
            return !this.$refs.password.$v.$invalid
          }

          return false
        }
      },
      secondPassphrase: {
        isValid(value) {
          if (!this.currentWallet.secondPublicKey) {
            return true
          }

          if (this.$refs.secondPassphrase) {
            return !this.$refs.secondPassphrase.$v.$invalid
          }
          return false
        }
      }
    }
  }
}
</script>

<style>
.SendAllConfirmation .ModalConfirmation__container {
  min-width: calc(var(--contact-identicon-xl) + 74px * 2);
  max-width: calc(var(--contact-identicon-xl) + 74px * 2 + 50px);
}
</style>
