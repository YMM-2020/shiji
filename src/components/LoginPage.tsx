import { useState, useRef } from 'react'
import Logo from './Logo'
import { Phone, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react'

interface LoginPageProps {
  onSendCode: (phone: string) => Promise<any>
  onLogin: (phone: string, code: string) => Promise<{ ok: boolean; error?: string }>
}

export default function LoginPage({ onSendCode, onLogin }: LoginPageProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onSendCode(phone)
      setStep('code')
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0 }; return c - 1 })
      }, 1000)
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch {
      setError('发送失败，请重试')
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    if (!code || code.length < 4) {
      setError('请输入验证码')
      return
    }
    setError('')
    setLoading(true)
    const result = await onLogin(phone, code)
    setLoading(false)
    if (!result.ok) {
      setError(result.error || '登录失败')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={48} showText={false} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">欢迎使用视己</h1>
          <p className="text-sm text-gray-400 mt-1">登录后 AI 将更好地了解你</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {step === 'phone' ? (
            <>
              <label className="block text-sm font-medium text-gray-600 mb-2">手机号</label>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                    placeholder="输入手机号"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <button
                  onClick={handleSendCode}
                  disabled={loading || phone.length < 11}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  下一步
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <p className="text-xs text-gray-400">未注册手机号将自动创建账号</p>
            </>
          ) : (
            <>
              <div className="text-center mb-3">
                <ShieldCheck size={32} className="mx-auto text-primary-500 mb-1" />
                <p className="text-sm text-gray-600">
                  验证码已发送至 <strong className="text-gray-800">{phone}</strong>
                </p>
              </div>
              <label className="block text-sm font-medium text-gray-600 mb-2">验证码</label>
              <input
                ref={inputRef}
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="输入验证码"
                autoFocus
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 mb-3"
              />
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <button
                onClick={handleLogin}
                disabled={loading || code.length < 4}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors mb-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                登录
              </button>
              <div className="flex justify-between text-xs">
                <button onClick={() => { setStep('phone'); setError('') }} className="text-gray-400 hover:text-gray-600">
                  ← 更换手机号
                </button>
                {countdown > 0 ? (
                  <span className="text-gray-400">{countdown}s 后可重发</span>
                ) : (
                  <button onClick={handleSendCode} className="text-primary-500 hover:text-primary-700">
                    重新发送
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
