<template>
  <div class="TokenTable w-full">
    <TableWrapper
      v-bind="$attrs"
      :columns="columns"
      :no-data-message="$t('SLP.TOKENSTAB.TABLENOTOKENS')"
      v-on="$listeners"
      @on-sort-change="onSortChange"
    >
      <template
        slot-scope="data"
      >
        <div
          v-if="data.column.field === 'name'"
        >
          {{ data.row.tokenName }}
        </div>

        <div
          v-else-if="data.column.field === 'symbol'"
        >
          {{ data.row.symbol }}
        </div>

        <div
          v-else-if="data.column.field === 'id'"
        >
          <a
            class="flex items-center whitespace-no-wrap"
            href="#"
            @click.stop="network_openExplorer('token', data.row.tokenId)"
          >
            <span
              class="mr-1"
            >
              {{ data.row.tokenId }}
            </span>
            <SvgIcon
              name="open-external"
              view-box="0 0 12 12"
              class="text-theme-page-text-light"
            />
          </a>
        </div>

        <div
          v-else-if="data.column.field === 'balance'"
          class="flex items-center justify-end"
        >
          <span
            class="font-bold mr-2 whitespace-no-wrap"
          >
            {{ (data.row.balance) }}
          </span>
        </div>
      </template>
    </TableWrapper>

    <Portal
      v-if="selected"
      to="modal"
    >
      <TransactionShow
        :transaction="selected"
        @close="onCloseModal"
      />
    </Portal>
  </div>
</template>

<script>
import SvgIcon from '@/components/SvgIcon'
import truncateMiddle from '@/filters/truncate-middle'
import TableWrapper from '@/components/utils/TableWrapper'

export default {
  name: 'TokenTable',

  components: {
    SvgIcon,
    TableWrapper
  },

  props: {
    hasShortId: {
      type: Boolean,
      required: false,
      default: false
    },
    isDashboard: {
      type: Boolean,
      required: false,
      default: false
    }
  },

  data: () => ({
    selected: null
  }),

  computed: {
    columns () {
      const vendorFieldClass = [
        'hidden', 'w-1/4'
      ]
      if (this.hasShortId && !this.isDashboard) {
        vendorFieldClass.push('xxl:table-cell')
      } else if (!this.isDashboard) {
        vendorFieldClass.push('xl:table-cell')
      }

      return [
        {
          label: this.$t('SLP.TOKENSTAB.TABLENAME'),
          field: 'name'
        },
        {
          label: this.$t('SLP.TOKENSTAB.TABLESYMBOL'),
          field: 'symbol'
        },
        {
          label: this.$t('SLP.TOKENSTAB.TABLETOKENID'),
          field: 'id',
          formatFn: this.formatTokenId
        },
        {
          label: this.$t('SLP.TOKENSTAB.TABLEBALANCE'),
          type: 'number',
          field: 'balance',
          formatFn: this.formatBalance,
          tdClass: 'text-right',
          thClass: 'text-right'
        }
      ]
    }
  },

  methods: {
    formatDate (value) {
      return this.formatter_date(value)
    },

    formatTokenId (value) {
      return this.hasShortId ? truncateMiddle(value, 6) : truncateMiddle(value, 10)
    },

    formatBalance (value) {
      return this.formatter_networkCurrency(value)
    },

    openTokens (id) {
      this.network_openExplorer('token', id)
    },

    onSortChange ({ columnIndex, sortType }) {
      if (this.columns[columnIndex]) {
        const columnName = this.columns[columnIndex].field
        this.$emit('on-sort-change', { columnName, sortType })
      }
    },

    onRowClick ({ row }) {
      this.selected = row
    },

    onCloseModal () {
      this.selected = null
    }
  }
}
</script>

<style lang="postcss">

</style>
