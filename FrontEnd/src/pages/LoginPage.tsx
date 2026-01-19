import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Hàm xử lý thông báo lỗi chuyên nghiệp
  const getLoginErrorMessage = (err: any): { title: string; description: string } => {
    const status = err.response?.status;
    const serverMessage = err.response?.data?.message || err.message || '';

    // Kiểm tra thông báo "Invalid credentials" từ server
    if (serverMessage.toLowerCase().includes('invalid credentials') || 
        serverMessage.toLowerCase().includes('unauthorized') ||
        serverMessage.toLowerCase().includes('sai mật khẩu') ||
        serverMessage.toLowerCase().includes('sai thông tin')) {
      return {
        title: 'Thông tin đăng nhập không chính xác',
        description: 'Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra và thử lại.'
      };
    }

    // Lỗi 401 - Sai thông tin đăng nhập
    if (status === 401) {
      if (serverMessage?.toLowerCase().includes('locked') || serverMessage?.toLowerCase().includes('khóa')) {
        return {
          title: 'Tài khoản bị khóa',
          description: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.'
        };
      }
      if (serverMessage?.toLowerCase().includes('inactive') || serverMessage?.toLowerCase().includes('vô hiệu')) {
        return {
          title: 'Tài khoản chưa kích hoạt',
          description: 'Tài khoản của bạn chưa được kích hoạt. Vui lòng liên hệ quản trị viên.'
        };
      }
      return {
        title: 'Thông tin đăng nhập không chính xác',
        description: 'Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra lại thông tin.'
      };
    }

    // Lỗi 403 - Không có quyền
    if (status === 403) {
      return {
        title: 'Truy cập bị từ chối',
        description: 'Bạn không có quyền truy cập hệ thống. Vui lòng liên hệ quản trị viên.'
      };
    }

    // Lỗi 429 - Too many requests
    if (status === 429) {
      return {
        title: 'Quá nhiều lần thử',
        description: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi vài phút và thử lại.'
      };
    }

    // Lỗi 500 - Server error
    if (status >= 500) {
      return {
        title: 'Lỗi hệ thống',
        description: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau hoặc liên hệ bộ phận kỹ thuật.'
      };
    }

    // Lỗi mạng
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      return {
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
      };
    }

    // Timeout
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return {
        title: 'Kết nối quá thời gian',
        description: 'Máy chủ phản hồi quá chậm. Vui lòng thử lại sau.'
      };
    }

    // Lỗi mặc định
    return {
      title: 'Đăng nhập thất bại',
      description: serverMessage || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Đang đăng nhập...', { username });
      await login({ username, password });
      console.log('Đăng nhập thành công');
      navigate('/');
    } catch (err: any) {
      console.error('Lỗi đăng nhập:', err);
      const errorInfo = getLoginErrorMessage(err);
      setError(`${errorInfo.title}|${errorInfo.description}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="max-w-6xl w-full mx-4 my-8">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Side - Login Form */}
            <div className="p-8 lg:p-12 xl:p-16">
              {/* Logo và tiêu đề */}
              <div className="mb-10 text-center">
                <div className="flex justify-center mb-6">
                  <img src="/logo.png" alt="QLXD System" className="h-20 w-auto drop-shadow-lg" />
                </div>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-600 mb-3">
                  Đăng nhập
                </h1>
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-6">
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L5 10.274zm10 0l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L15 10.274z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium">Hệ thống quản lý cửa hàng xăng dầu</p>
                </div>
              </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm animate-shake">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-red-800 mb-1">
                    {error.includes('|') ? error.split('|')[0] : 'Đăng nhập thất bại'}
                  </h3>
                  <p className="text-sm text-red-600 leading-relaxed">
                    {error.includes('|') ? error.split('|')[1] : error}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-all"
                placeholder="Nhập tên đăng nhập"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-all"
                  placeholder="Nhập mật khẩu"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                boxShadow: loading ? 'none' : '0 4px 14px 0 rgba(59, 130, 246, 0.39)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.boxShadow = '0 6px 20px 0 rgba(59, 130, 246, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(59, 130, 246, 0.39)';
                }
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

              {/* Footer */}
              <div className="mt-8">
                <p className="text-xs text-gray-500 text-center">
                  © 2026 QLXD. SWP.
                </p>
              </div>
            </div>

            {/* Right Side - Welcome Panel */}
            <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-blue-100 p-12">
              <div className="text-center max-w-xl w-full px-8">
                <div className="mb-16">
                  <h2 className="font-black tracking-wider leading-tight uppercase" style={{ fontFamily: "'Montserrat', 'Inter', sans-serif", letterSpacing: '0.05em', fontSize: 'clamp(4rem, 12vw, 16rem)' }}>
                    <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">S.W.P</span>
                    <span className="text-gray-400 mx-2">-</span>
                    <span className="bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent">CHI NHÁNH MIỀN BẮC</span>
                  </h2>
                  <div className="h-3 w-64 bg-gradient-to-r from-blue-600 to-orange-600 mx-auto mt-8 rounded-full shadow-lg"></div>
                </div>
                <div className="relative">
                  <div className="absolute
Chào mừng bạn đã đến-inset-2 bg-gradient-to-r from-orange-300 to-blue-400 rounded-3xl blur-xl opacity-30 animate-pulse"></div>
                  <div className="relative bg-white rounded-3xl p-10 shadow-2xl border-2 border-gradient">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-orange-200/30 to-blue-200/30 opacity-50"></div>
                    <div className="relative">
                      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f26722] to-[#31b3e7] mb-4">
                        Chào mừng bạn đã đến với S.W.P
                      </h3>
                      <div className="h-px w-24 bg-gradient-to-r from-[#f26722] to-[#31b3e7] mx-auto mb-6"></div>
                      <p className="text-xl font-semibold text-gray-800 leading-relaxed mb-2">
                        Chúc bạn một ngày tốt lành
                      </p>
                      <p className="text-lg text-gray-600 font-medium">
                        và làm việc hiệu quả
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
