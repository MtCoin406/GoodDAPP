// @flow
import React, { useCallback, useEffect, useState } from 'react'
import { t } from '@lingui/macro'
import { useDebouncedCallback } from 'use-debounce'
import Config from '../../../config/config'
import LoadingIcon from '../modal/LoadingIcon'
import { useAPIConnection, useConnection, useWeb3Polling } from '../../../lib/hooks/hasConnectionChange'
import { useDialog } from '../../../lib/dialog/useDialog'
import logger from '../../../lib/logger/js-logger'
import mustache from '../../../lib/utils/mustache'

const log = logger.child({ from: 'InternetConnection' })

const InternetConnection = props => {
  const { hideDialog, showDialog } = useDialog()
  const { isLoggedIn } = props
  const isConnection = useConnection()
  const isAPIConnection = useAPIConnection(!isLoggedIn) // only ping server and block usage for new users if server is down.
  const [showDisconnect, setShowDisconnect] = useState(false)
  const [firstLoadError, setFirstLoadError] = useState(true)

  const showWaiting = useCallback(
    message => {
      setShowDisconnect(true)

      if (!isLoggedIn) {
        showDialog({
          title: t`Waiting for network`,
          image: <LoadingIcon />,
          message,
          showButtons: false,
          showCloseButtons: false,
        })
      }
    },
    [setShowDisconnect, showDialog, isLoggedIn],
  )

  const showDialogWindow = useDebouncedCallback(showWaiting, Config.delayMessageNetworkDisconnection)

  useWeb3Polling()

  useEffect(() => {
    showDialogWindow.cancel()

    if (isConnection === false || isAPIConnection === false) {
      log.warn('connection failed:', {
        isAPIConnection,
        isConnection,

        // isConnectionWeb3,
        firstLoadError,
      })

      // supress showing the error dialog while in splash and connecting
      if (firstLoadError) {
        return setShowDisconnect(true)
      }

      let message

      if (isConnection === false) {
        message = t`Check your internet connection`
      } else {
        const servers = []

        if (isAPIConnection === false) {
          servers.push('API')
        }

        message = mustache(t`Waiting for GoodDollar's server ({servers})`, { servers: servers.join(', ') })
      }

      showDialogWindow(message, showDialog, setShowDisconnect)
    } else {
      log.debug('connection back - hiding dialog')

      // first time that connection is ok, from now on we will start showing the connection dialog on error
      setFirstLoadError(false)
      showDialogWindow && showDialogWindow.cancel()

      // hideDialog should be executed only if the internetConnection dialog is shown.
      // otherwise it may close some another non related popup (e.g. Unsupported Browser, App Version Update)
      showDisconnect && !firstLoadError && hideDialog()
      setShowDisconnect(false)
    }
  }, [
    isConnection,
    isAPIConnection,
    setShowDisconnect,
    setFirstLoadError,
    showDialogWindow,
    firstLoadError,
    showDisconnect,
  ])

  return showDisconnect && props.showSplash && props.onDisconnect && props.isLoggedIn
    ? props.onDisconnect()
    : props.children
}

export default InternetConnection
