import { Tooltip, Grid } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { ActionIcon } from '../ActionIcon'

export const NotificationBell: React.FC = () => {
  const { t } = useTranslation()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  return (
    <Tooltip title={isMobile ? '' : t('notifications')}>
      <ActionIcon>
        <BellOutlined />
      </ActionIcon>
    </Tooltip>
  )
}
