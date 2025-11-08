import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { cards } from '../utils/api';
import Layout from '../components/Layout';
import { 
  CreditCard, 
  Users, 
  Clock, 
  TrendingUp,
  Upload,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentCards, setRecentCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, cardsResponse] = await Promise.all([
        cards.getStats('30d'),
        cards.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
      ]);
      
      setStats(statsResponse.data.data);
      setRecentCards(cardsResponse.data.data.cards);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, change, color = 'primary', trend }) => (
    <div className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${
              color === 'primary' ? 'from-blue-500 to-blue-600' :
              color === 'green' ? 'from-green-500 to-green-600' :
              color === 'blue' ? 'from-cyan-500 to-cyan-600' :
              color === 'purple' ? 'from-purple-500 to-purple-600' :
              'from-gray-500 to-gray-600'
            } shadow-lg`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-2xl font-bold text-gray-900">
                {value}
              </dd>
              {change && (
                <dd className="text-xs text-gray-600 flex items-center space-x-1">
                  <span>{change}</span>
                  {trend && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      trend > 0 ? 'bg-green-100 text-green-800' : 
                      trend < 0 ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
                    </span>
                  )}
                </dd>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600">
            {user?.organization?.name} • {user?.role}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Cards Processed"
            value={stats?.totalCards?.toLocaleString() || 0}
            icon={CreditCard}
            change="All time"
            trend={stats?.totalCardsTrend}
          />
          <StatCard
            title="This Month"
            value={stats?.periodCards?.toLocaleString() || 0}
            icon={TrendingUp}
            change="Last 30 days"
            color="green"
            trend={stats?.monthlyTrend}
          />
          <StatCard
            title="Avg Processing Time"
            value={`${Math.round(stats?.avgProcessingTime || 0)}ms`}
            icon={Clock}
            change="Response time"
            color="blue"
            trend={stats?.processingTrend}
          />
          <StatCard
            title="Active Users"
            value={stats?.topExtractors?.length || 0}
            icon={Users}
            change="This month"
            color="purple"
            trend={stats?.usersTrend}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Cards */}
          <div className="card hover:shadow-lg transition-shadow duration-300">
            <div className="card-header bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                Recent Cards
              </h3>
            </div>
            <div className="card-body">
              {recentCards.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">No cards processed yet</h4>
                  <p className="text-xs text-gray-500 mb-4">Get started by uploading your first business card</p>
                  <button
                    onClick={() => window.location.href = '/cards'}
                    className="btn-primary text-sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload First Card
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCards.map((card, index) => (
                    <div key={card._id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-purple-50 transition-all duration-200 border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                            index % 4 === 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                            index % 4 === 1 ? 'bg-gradient-to-br from-green-500 to-green-600' :
                            index % 4 === 2 ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                            'bg-gradient-to-br from-amber-500 to-amber-600'
                          }`}>
                            {(card.data.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {card.data.name || 'Unknown Name'}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {card.data.company || 'No company'}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(card.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => window.location.href = `/cards`}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all duration-200"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="text-center pt-3 border-t border-gray-100">
                    <button
                      onClick={() => window.location.href = '/cards'}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline transition-colors duration-200"
                    >
                      View all cards ({stats?.totalCards || 0}) →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card hover:shadow-lg transition-shadow duration-300">
            <div className="card-header bg-gradient-to-r from-purple-50 to-blue-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                Quick Actions
              </h3>
            </div>
            <div className="card-body space-y-3">
              <button
                onClick={() => window.location.href = '/cards'}
                className="w-full btn-primary justify-start hover:shadow-md transition-all duration-200 group"
              >
                <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3 group-hover:bg-opacity-30 transition-all duration-200">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Process New Card</div>
                  <div className="text-xs opacity-90">Upload or capture business card</div>
                </div>
              </button>
              
              <button
                onClick={() => window.location.href = '/cards'}
                className="w-full btn-secondary justify-start hover:shadow-sm transition-all duration-200 group"
              >
                <div className="p-2 bg-gray-100 rounded-lg mr-3 group-hover:bg-gray-200 transition-all duration-200">
                  <Eye className="h-5 w-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">View All Cards</div>
                  <div className="text-xs text-gray-500">Browse and manage extracted data</div>
                </div>
              </button>

              {user?.role === 'admin' && (
                <>
                  <div className="border-t border-gray-200 pt-3 mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Admin Actions
                    </h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => window.location.href = '/admin/settings'}
                        className="w-full btn-secondary justify-start text-sm hover:shadow-sm transition-all duration-200 group"
                      >
                        <div className="p-2 bg-blue-100 rounded-lg mr-3 group-hover:bg-blue-200 transition-all duration-200">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">AI Settings</div>
                          <div className="text-xs text-gray-500">Configure extraction parameters</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => window.location.href = '/admin/users'}
                        className="w-full btn-secondary justify-start text-sm hover:shadow-sm transition-all duration-200 group"
                      >
                        <div className="p-2 bg-purple-100 rounded-lg mr-3 group-hover:bg-purple-200 transition-all duration-200">
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Manage Users</div>
                          <div className="text-xs text-gray-500">Invite and organize team</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Extractors */}
        {stats?.topExtractors?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Top Extractors (30 days)</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {stats.topExtractors.map((extractor, index) => (
                  <div key={extractor._id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {index + 1}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {extractor.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {extractor.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {extractor.count} cards
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;