import { CasperContractClient, helpers, utils } from 'casper-js-client-helper'
import { DEFAULT_TTL } from 'casper-js-client-helper/dist/constants'
import {
  CLValueBuilder,
  RuntimeArgs,
  CLAccountHash,
  CLString,
  CLPublicKey,
  CLByteArray,
  CLKey,
  CLValueParsers,
} from 'casper-js-sdk'
import blake from 'blakejs'

const { setClient, contractSimpleGetter, createRecipientAddress } = helpers

export class CEP78Client extends CasperContractClient {
  constructor(contractHash: string, nodeAddress: string, chainName: string, public namedKeysList: string[] = []) {
    super(nodeAddress, chainName)
    this.contractHash = contractHash.startsWith('hash-') ? contractHash.slice(5) : contractHash
    this.nodeAddress = nodeAddress
    this.chainName = chainName
    this.namedKeysList = [
      'balances',
      'burnt_tokens',
      'metadata_cep78',
      'metadata_custom_validated',
      'metadata_nft721',
      'metadata_raw',
      'operators',
      'owned_tokens',
      'token_issuers',
      'page_table',
      'page_0',
      'page_1',
      'page_2',
      'page_3',
      'page_4',
      'page_5',
      'page_6',
      'page_7',
      'page_8',
      'page_9',
      'page_10',
      'user_mint_id_list',
      'hash_by_index',
      'events',
      'index_by_hash',
      'receipt_name',
      'rlo_mflag',
      'reporting_mode',
    ]
    this.namedKeysList.push(...namedKeysList)
  }

  NFTMetadataKind = {
    CEP78: 0,
    NFT721: 1,
    Raw: 2,
    CustomValidated: 3,
  }

  async init(): Promise<void> {
    const { contractPackageHash, namedKeys } = await setClient(this.nodeAddress, this.contractHash, this.namedKeysList)
    this.contractPackageHash = contractPackageHash
    /* @ts-ignore */
    this.namedKeys = namedKeys
  }

  static async createInstance(
    contractHash: string,
    nodeAddress: string,
    chainName: string,
    namedKeysList = [],
  ): Promise<CEP78Client> {
    const wNFT = new CEP78Client(contractHash, nodeAddress, chainName, namedKeysList)
    await wNFT.init()
    return wNFT
  }

  async identifierMode() {
    const mode = await contractSimpleGetter(this.nodeAddress, this.contractHash, ['identifier_mode'])
    return mode.toNumber()
  }

  async collectionName() {
    return await this.readContractField('collection_name')
  }

  async allowMinting() {
    return await this.readContractField('allow_minting')
  }

  async collectionSymbol() {
    return await this.readContractField('collection_symbol')
  }

  async contractWhitelist() {
    return await this.readContractField('contract_whitelist')
  }

  async holderMode() {
    return await this.readContractField('holder_mode')
  }

  async installer() {
    return await this.readContractField('installer')
  }

  async jsonSchema() {
    return await this.readContractField('json_schema')
  }

  async metadataMutability() {
    return await this.readContractField('metadata_mutability')
  }

  async mintingMode() {
    return await this.readContractField('minting_mode')
  }

  async nftKind() {
    return await this.readContractField('nft_kind')
  }

  async nftMetadataKind() {
    return await this.readContractField('nft_metadata_kind')
  }

  async numberOfMintedTokens() {
    return await this.readContractField('number_of_minted_tokens')
  }

  async ownershipMode() {
    return await this.readContractField('ownership_mode')
  }

  async receiptName() {
    return await this.readContractField('receipt_name')
  }

  async totalTokenSupply() {
    return await this.readContractField('total_token_supply')
  }

  async whitelistMode() {
    return await this.readContractField('whitelist_mode')
  }

  async readContractField(field) {
    return await contractSimpleGetter(this.nodeAddress, this.contractHash, [field])
  }

  async getOperator(tokenId) {
    try {
      const itemKey = tokenId.toString()
      const result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.operator)
      return Buffer.from(result.val.data.data).toString('hex')
    } catch (e) {
      throw e
    }
  }

  async getOwnerOf(tokenId) {
    try {
      const itemKey = tokenId.toString()
      const result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.tokenOwners)
      return Buffer.from(result.data).toString('hex')
    } catch (e) {
      throw e
    }
  }

  async burntTokens(tokenId) {
    try {
      const itemKey = tokenId.toString()
      const result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.burntTokens)
      return result ? true : false
    } catch (e) {}
    return false
  }

  async getTokenMetadata(tokenId) {
    try {
      const itemKey = tokenId.toString()
      let nftMetadataKind = await this.nftMetadataKind()
      nftMetadataKind = parseInt(nftMetadataKind.toString())
      let result = null
      if (nftMetadataKind == this.NFTMetadataKind.CEP78) {
        result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.metadataCep78)
      } else if (nftMetadataKind == this.NFTMetadataKind.CustomValidated) {
        result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.metadataCustomValidated)
      } else if (nftMetadataKind == this.NFTMetadataKind.NFT721) {
        result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.metadataNft721)
      } else if (nftMetadataKind == this.NFTMetadataKind.Raw) {
        result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.metadataRaw)
      }
      // } else if (nftMetadataKind == this.NFTMetadataKind.CasperPunk) {
      //     console.log(this.namedKeys.metadataCasperpunk)
      //     result = await utils.contractDictionaryGetter(
      //         this.nodeAddress,
      //         itemKey,
      //         this.namedKeys.metadataCasperpunk
      //         //"uref-d97097a04ee5957aacb78859843476b01290fd39bb81cd32d6e5d4a66e2593ee-007"
      //     );
      // }

      return result
    } catch (e) {
      throw e
    }
  }

  static getAccountItemKey(account) {
    let itemKey = ''
    if (typeof account === 'string') {
      itemKey = account.toString()
    } else {
      const key = createRecipientAddress(account)
      itemKey = Buffer.from(key.data.data).toString('hex')
    }
    return itemKey
  }

  async getOwnedTokens(account) {
    try {
      const itemKey = CEP78Client.getAccountItemKey(account)
      const result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.ownedTokens)
      return result.map(e => e.data)
    } catch (e) {
      throw e
    }
  }

  async balanceOf(account) {
    try {
      const itemKey = CEP78Client.getAccountItemKey(account)
      const result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.balances)
      return result
    } catch (e) {
      throw e
    }
  }

  async getOwnedTokenIds(account) {
    const table = []
    try {
      const itemKey = CEP78Client.getAccountItemKey(account)
      const result1 = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.pageTable)

      for (let i = 0; i < result1.length; i++) {
        if (result1[i].data == true) {
          table.push(i)
        }
      }

      const tokenIds = []

      for (let j = 0; j < table.length; j++) {
        const k = table[j]

        const numberOfPage = 'page_' + k
        const result2 = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys[numberOfPage])
        for (let i = 0; i < result2.length; i++) {
          if (result2[i].data == true) {
            tokenIds.push(i)
          }
        }
      }
      return tokenIds
      // return table;
    } catch (e) {
      throw e
    }
  }

  async getOwnedTokenIdsHash(account) {
    const table = []
    try {
      const itemKey = CEP78Client.getAccountItemKey(account)
      const result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.pageTable)

      for (let i = 0; i < result.length; i++) {
        if (result[i].data == true) {
          table.push(i)
        }
      }

      const tokenIds = []

      for (let j = 0; j < table.length; j++) {
        const k = table[j]

        const numberOfPage = 'page_' + k
        const result1 = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys[numberOfPage])
        for (let i = 0; i < result1.length; i++) {
          if (result1[i].data == true) {
            tokenIds.push(i)
          }
        }
      }
      const final = []
      for (let m = 0; m < tokenIds.length; m++) {
        const string = tokenIds[m].toString()
        const result2 = await utils.contractDictionaryGetter(this.nodeAddress, string, this.namedKeys.hashByIndex)
        final.push(result2)
      }
      return final
    } catch (e) {
      throw e
    }
  }

  async pageTable(account) {
    try {
      const itemKey = CEP78Client.getAccountItemKey(account)
      console.log(this.namedKeys.pageTable)
      const result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.pageTable)

      const table = []

      for (let i = 0; i < result.length; i++) {
        if (result[i].data == true) {
          table.push(i)
        }
      }
      return table
    } catch (e) {
      throw e
    }
  }

  async pageDetails(i, account) {
    try {
      const itemKey = CEP78Client.getAccountItemKey(account)
      const numberOfPage = 'page_' + i
      const result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys[numberOfPage])

      const tokenIds = []

      for (let j = 0; j < result.length; j++) {
        if (result[j].data == true) {
          tokenIds.push(j)
        }
      }
      return tokenIds
    } catch (e) {
      throw e
    }
  }

  async approve(keys, operator, tokenId, paymentAmount, ttl) {
    const key = createRecipientAddress(operator)
    let identifierMode = await this.identifierMode()
    identifierMode = parseInt(identifierMode.toString())
    let runtimeArgs: RuntimeArgs = undefined
    if (identifierMode == 0) {
      runtimeArgs = RuntimeArgs.fromMap({
        token_id: CLValueBuilder.u64(parseInt(tokenId)),
        operator: key,
      })
    } else {
      runtimeArgs = RuntimeArgs.fromMap({
        token_hash: CLValueBuilder.string(tokenId),
        operator: key,
      })
    }

    return await this.contractCall({
      entryPoint: 'approve',
      keys,
      paymentAmount: paymentAmount ? paymentAmount : '1000000000',
      runtimeArgs,
      cb: deployHash => {},
      ttl: ttl ? ttl : DEFAULT_TTL,
    })
  }

  async mint({ keys, tokenOwner, metadataJson, paymentAmount, ttl }) {
    // Owner input is accountHash
    tokenOwner = tokenOwner.startsWith('account-hash-') ? tokenOwner.slice(13) : tokenOwner

    const ownerAccountHashByte = Uint8Array.from(Buffer.from(tokenOwner, 'hex'))

    const ownerKey = createRecipientAddress(new CLAccountHash(ownerAccountHashByte))

    const token_metadata = new CLString(JSON.stringify(metadataJson))
    const runtimeArgs = RuntimeArgs.fromMap({
      token_owner: ownerKey,
      token_meta_data: token_metadata,
    })

    return await this.contractCall({
      entryPoint: 'mint',
      keys: keys,
      paymentAmount: paymentAmount ? paymentAmount : '10000000000',
      runtimeArgs,
      cb: deployHash => {},
      ttl: ttl ? ttl : DEFAULT_TTL,
    })
  }

  async claim({ keys, paymentAmount, ttl }) {
    // Owner input is accountHash
    // tokenOwner = tokenOwner.startsWith("account-hash-")
    //     ? tokenOwner.slice(13)
    //     : tokenOwner;

    // let ownerAccountHashByte = Uint8Array.from(
    //     Buffer.from(tokenOwner, 'hex'),
    // )

    // const ownerKey = createRecipientAddress(new CLAccountHash(ownerAccountHashByte))

    // let token_metadata = new CLString(JSON.stringify(metadataJson))
    const runtimeArgs = RuntimeArgs.fromMap({
      // token_owner: ownerKey,
      // token_meta_data: token_metadata,
    })

    return await this.contractCall({
      entryPoint: 'claim',
      keys: keys,
      paymentAmount: paymentAmount ? paymentAmount : '20000000000',
      runtimeArgs,
      cb: deployHash => {},
      ttl: ttl ? ttl : DEFAULT_TTL,
    })
  }

  async registerOwner({ keys, tokenOwner, paymentAmount, ttl }) {
    const ownerKey = createRecipientAddress(CLPublicKey.fromHex(tokenOwner))
    const runtimeArgs = RuntimeArgs.fromMap({
      token_owner: ownerKey,
      // token_meta_data: token_metadata,
    })

    return await this.contractCall({
      entryPoint: 'register_owner',
      keys: keys,
      paymentAmount: paymentAmount ? paymentAmount : '1000000000',
      runtimeArgs,
      cb: deployHash => {},
      ttl: ttl ? ttl : DEFAULT_TTL,
    })
  }

  async mintOfficial({ keys, tokenOwner, metadataJson, paymentAmount, ttl }) {
    // Owner input is accountHash
    // tokenOwner = tokenOwner.startsWith("account-hash-")
    //     ? tokenOwner.slice(13)
    //     : tokenOwner;

    // let ownerAccountHashByte = Uint8Array.from(
    //     Buffer.from(tokenOwner, 'hex'),
    // )

    const ownerKey = createRecipientAddress(CLPublicKey.fromHex(tokenOwner))
    const hashesMap = ['32']

    const token_metadata = CLValueBuilder.list(metadataJson.map(id => CLValueBuilder.string(id)))
    const hashes = CLValueBuilder.list(hashesMap.map(hash => CLValueBuilder.string(hash)))

    // let token_metadata = new CLString(JSON.stringify(metadataJson))
    const runtimeArgs = RuntimeArgs.fromMap({
      token_owner: ownerKey,
      token_meta_datas: token_metadata,
      token_hashes: hashes,
    })

    return await this.contractCall({
      entryPoint: 'mint',
      keys: keys,
      paymentAmount: paymentAmount ? paymentAmount : '22000000000',
      runtimeArgs,
      cb: deployHash => {},
      ttl: ttl ? ttl : DEFAULT_TTL,
    })
  }

  async approveForAll(keys, operator, paymentAmount, ttl) {
    const key = createRecipientAddress(operator)
    const runtimeArgs = RuntimeArgs.fromMap({
      operator: key,
    })

    return await this.contractCall({
      entryPoint: 'set_approval_for_all',
      keys: keys,
      paymentAmount: paymentAmount ? paymentAmount : '1000000000',
      runtimeArgs,
      cb: deployHash => {},
      ttl: ttl ? ttl : DEFAULT_TTL,
    })
  }

  async burn(keys, tokenId, paymentAmount, ttl) {
    let identifierMode = await this.identifierMode()
    identifierMode = parseInt(identifierMode.toString())
    let runtimeArgs: RuntimeArgs = undefined

    if (identifierMode == 0) {
      runtimeArgs = RuntimeArgs.fromMap({
        token_id: CLValueBuilder.u64(parseInt(tokenId)),
      })
    } else {
      runtimeArgs = RuntimeArgs.fromMap({
        token_hash: CLValueBuilder.string(tokenId),
      })
    }

    return await this.contractCall({
      entryPoint: 'burn',
      keys: keys,
      paymentAmount: paymentAmount ? paymentAmount : '1000000000',
      runtimeArgs,
      cb: deployHash => {},
      ttl: ttl ? ttl : DEFAULT_TTL,
    })
  }

  async checkOperatorDictionaryKey(caller, operator) {
    try {
      const callerKey = createRecipientAddress(CLPublicKey.fromHex(caller))
      const contracthashbytearray = new CLByteArray(Uint8Array.from(Buffer.from(operator, 'hex')))
      const operatorKey = new CLKey(contracthashbytearray)
      const callerKeyBytes = CLValueParsers.toBytes(callerKey).val
      const operatorKeyBytes = CLValueParsers.toBytes(operatorKey).val

      if (operatorKeyBytes instanceof Uint8Array && callerKeyBytes instanceof Uint8Array) {
        const mix = Array.from(callerKeyBytes).concat(Array.from(operatorKeyBytes))
        const itemKeyArray = blake.blake2b(Buffer.from(mix), null, 32)
        const itemKey = Buffer.from(itemKeyArray).toString('hex')
        const result = await utils.contractDictionaryGetter(this.nodeAddress, itemKey, this.namedKeys.operators)
        return result
      }

      return undefined
    } catch (e) {
      console.error(e)
    }
  }

  async transfer(keys, source, recipient, tokenId, paymentAmount, ttl) {
    let identifierMode = await this.identifierMode()
    identifierMode = parseInt(identifierMode.toString())
    let runtimeArgs: RuntimeArgs = undefined

    if (identifierMode == 0) {
      runtimeArgs = RuntimeArgs.fromMap({
        token_id: CLValueBuilder.u64(parseInt(tokenId)),
        source_key: createRecipientAddress(source),
        target_key: createRecipientAddress(recipient),
      })
    } else {
      runtimeArgs = RuntimeArgs.fromMap({
        token_hash: CLValueBuilder.string(tokenId),
        source_key: createRecipientAddress(source),
        target_key: createRecipientAddress(recipient),
      })
    }

    return await this.contractCall({
      entryPoint: 'transfer',
      keys: keys,
      paymentAmount: paymentAmount ? paymentAmount : '1000000000',
      runtimeArgs,
      cb: deployHash => {},
      ttl: ttl ? ttl : DEFAULT_TTL,
    })
  }
}
