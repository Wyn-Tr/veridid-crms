import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'

import { ConnectStackParams } from '../types/navigators'
import ESSIScan from './essi/ESSIScan'

export type ScanProps = StackScreenProps<ConnectStackParams>

const Scan: React.FC<ScanProps> = (props) => {
  return <ESSIScan {...props} />
}

export default Scan
