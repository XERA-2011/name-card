const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')
const APP = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    wxlogin: true,
    showMpjbutton: false,

    openShare: false,
    cardUserInfo: undefined,
    kActionType: {},
    content: '...',
    qrcode: undefined
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (e) {
    if (e.scene) { // 扫码
      const scene = decodeURIComponent(e.scene)
      wx.setStorageSync('referrer', scene)
      wx.setStorageSync('cardUid', scene)
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  async onShow() {
    // AUTH.checkHasLogined().then(isLogined => {
    //   this.setData({
    //     wxlogin: isLogined
    //   })
    // })
    await WXAPI.queryConfigBatch('mallName,DEFAULT_FRIEND_UID').then(function (res) {
      if (res.code == 0) {
        res.data.forEach(config => {
          wx.setStorageSync(config.key, config.value);
        })
      }
    })

    const cardUid = await this.getCardUid()
    this.getCardInfo(cardUid)
    const qrcode = APP.globalData._haibaoimg_qrcode ?? wx.getStorageSync('_haibaoimg_qrcode');
    if (!qrcode) {
      // 获取二维码(理论上会更新缓存地址)
      WXAPI.wxaQrcode({
        scene: cardUid,
        page: 'pages/card/card',
        is_hyaline: false,
        expireHours: 1
      }).then(res => {
        if (res.code == 0) {
          APP.globalData._haibaoimg_qrcode = res.data;
          wx.setStorageSync('_haibaoimg_qrcode', res.data);
          this.setData({
            qrcode: res.data
          })
        }
      })
    } else {
      this.setData({
        qrcode
      })
    }
  },
  async getCardUid() {
    let cardUid = wx.getStorageSync('cardUid')
    const uid = wx.getStorageSync('uid')
    if (!cardUid) {
      // 没有通过链接或者扫码进来
      if (uid) {
        // 当前用户已登录
        const res = await WXAPI.userDetail(wx.getStorageSync('token'))
        if (res.code == 0 && res.data.userLevel && res.data.userLevel.name === 'aicard') {
          return uid
        }
      }
      // 读取默认设置
      cardUid = wx.getStorageSync('DEFAULT_FRIEND_UID')
    }
    return cardUid
  },
  async getCardInfo(cardUid) {
    const uid = wx.getStorageSync('uid')
    const token = wx.getStorageSync('token')
    if (uid) {
      // 添加到我的名片夹
      WXAPI.addFriend(token, cardUid)
    }
    // 读取名片详情信息
    const res = await WXAPI.friendUserDetail(token, cardUid)
    if (res.code == 0) {
      const _data = {
        kActionType: {}
      }
      if (res.data.userLevel && res.data.userLevel.maxUser && res.data.userLevel.maxUser > 1) {
        _data.showMpjbutton = true
      }
      console.log('res.data----',res.data);
      _data.cardUserInfo = res.data
      if (_data.cardUserInfo.ext) {
        Object.keys(_data.cardUserInfo.ext).forEach(k => {
          // kActionType
          const v = _data.cardUserInfo.ext[k]
          _data.kActionType[k] = v
        })
      }
      wx.setNavigationBarTitle({
        // title: _data.cardUserInfo.base.nick + ' - ' + wx.getStorageSync('mallName')
        title: _data.cardUserInfo.base.nick
      })
      console.log(_data);
      this.setData(_data)
    }
  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: this.data.cardUserInfo.base.nick + ' 的个人名片。',
      path: '/pages/card/card?cardUid=' + this.data.cardUserInfo.base.id,
      imageUrl: this.data.cardUserInfo.base.avatarUrl
    }
  },
  callPhone() {
    wx.makePhoneCall({
      phoneNumber: this.data.cardUserInfo.base.mobile
    })
  },
  copyData(e) {
    const v = e.currentTarget.dataset.v
    wx.setClipboardData({
      data: v,
      success: (res) => {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        })
      }
    })
  },
  goIndex() {
    wx.navigateTo({
      url: '/pages/index/index'
    })
  },
  createHaibao() { // 生成海报
    wx.chooseImage({
      count: 1,
      success: (res) => {
        console.log(res)
        wx.setStorageSync('_haibaoimg', res.tempFilePaths[0])
        this.cardposter()
      }
    })
  },
  cardposter() {
    wx.navigateTo({
      url: '/pages/cardposter/cardposter?cardUid=' + this.data.cardUserInfo.base.id
    })
  },
  addPhoneContact() {
    // 调用登录接口
    wx.addPhoneContact({
      photoFilePath: this.data.cardUserInfo.base.avatarUrl,
      organization: wx.getStorageSync('mallName'),
      title: this.data.cardUserInfo.ext['职位'],
      firstName: this.data.cardUserInfo.base.nick,
      mobilePhoneNumber: this.data.cardUserInfo.base.mobile
    })
  },
  cancelLogin() {
    this.setData({
      wxlogin: true
    })
  },
  processLogin(e) {
    if (!e.detail.userInfo) {
      wx.showToast({
        title: '已取消',
        icon: 'none',
      })
      return;
    }
    AUTH.register(this);
  },
})