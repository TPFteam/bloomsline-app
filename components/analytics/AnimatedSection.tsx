import { useEffect, useRef } from 'react'
import { View, Animated as RNAnimated } from 'react-native'

type Props = {
  index: number
  children: React.ReactNode
}

export default function AnimatedSection({ index, children }: Props) {
  const opacity = useRef(new RNAnimated.Value(0)).current
  const translateY = useRef(new RNAnimated.Value(20)).current

  useEffect(() => {
    const delay = index * 120
    RNAnimated.parallel([
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      RNAnimated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start()
  }, [index])

  return (
    <RNAnimated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </RNAnimated.View>
  )
}
