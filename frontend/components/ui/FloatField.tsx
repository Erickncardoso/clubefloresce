'use client'

import {
  FocusEventHandler,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useId,
  useState,
} from 'react'

type Shared = {
  label: string
  icon?: ReactNode
  className?: string
}

type InputProps = Shared &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    as?: 'input'
  }

type TextareaProps = Shared &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
    as: 'textarea'
  }

type SelectProps = Shared &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
    as: 'select'
    children: ReactNode
  }

export type FloatFieldProps = InputProps | TextareaProps | SelectProps

const STRIP_KEYS = ['label', 'icon', 'className', 'as', 'onFocus', 'onBlur'] as const

function nativeProps(props: FloatFieldProps) {
  const next: Record<string, unknown> = { ...props }
  for (const key of STRIP_KEYS) delete next[key]
  if ('children' in next && props.as !== 'select') delete next.children
  return next
}

export function FloatField(props: FloatFieldProps) {
  const generatedId = useId()
  const id = props.id || generatedId
  const [focused, setFocused] = useState(false)

  const onFocus: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = (
    e,
  ) => {
    setFocused(true)
    props.onFocus?.(e as never)
  }

  const onBlur: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = (
    e,
  ) => {
    setFocused(false)
    props.onBlur?.(e as never)
  }

  const fieldClass = [
    'field',
    'field--float',
    focused ? 'is-focused' : '',
    props.className,
  ]
    .filter(Boolean)
    .join(' ')

  const rest = nativeProps(props)

  let control: ReactNode
  if (props.as === 'textarea') {
    control = (
      <textarea
        id={id}
        className={props.icon ? undefined : 'cf-squircle cf-squircle--control'}
        {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    )
  } else if (props.as === 'select') {
    control = (
      <select
        id={id}
        className={props.icon ? undefined : 'cf-squircle cf-squircle--control'}
        {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {props.children}
      </select>
    )
  } else {
    control = (
      <input
        id={id}
        className={props.icon ? undefined : 'cf-squircle cf-squircle--control'}
        {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    )
  }

  return (
    <div className={fieldClass}>
      <label htmlFor={id}>{props.label}</label>
      {props.icon ? (
        <div className="field-control cf-squircle cf-squircle--control">
          <span className="field-icon" aria-hidden>
            {props.icon}
          </span>
          {control}
        </div>
      ) : (
        control
      )}
    </div>
  )
}
