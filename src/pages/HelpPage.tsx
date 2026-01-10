import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  HelpCircle, 
  Book,
  MessageCircle,
  Video,
  FileText,
  Search,
  ChevronRight,
  Mail,
  Phone,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HelpPage() {
  const { t, language } = useLanguage();

  const helpCategories = [
    { 
      title: t('help.catGettingStarted'), 
      icon: Book, 
      description: t('help.catGettingStartedDesc'),
      articles: 12,
    },
    { 
      title: t('help.catDashboard'), 
      icon: FileText, 
      description: t('help.catDashboardDesc'),
      articles: 8,
    },
    { 
      title: t('help.catInvoice'), 
      icon: FileText, 
      description: t('help.catInvoiceDesc'),
      articles: 15,
    },
    { 
      title: t('help.catVideo'), 
      icon: Video, 
      description: t('help.catVideoDesc'),
      articles: 6,
    },
  ];

  const faqs = [
    { 
      question: t('help.faq1Q'),
      answer: t('help.faq1A'),
    },
    { 
      question: t('help.faq2Q'),
      answer: t('help.faq2A'),
    },
    { 
      question: t('help.faq3Q'),
      answer: t('help.faq3A'),
    },
    { 
      question: t('help.faq4Q'),
      answer: t('help.faq4A'),
    },
    { 
      question: t('help.faq5Q'),
      answer: t('help.faq5A'),
    },
  ];

  return (
    <>
      <Helmet>
        <title>{t('help.title')} | Bluecore Finance</title>
        <meta name="description" content={t('help.subtitle')} />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t('help.title')}</h1>
          <p className="text-muted-foreground mb-6">{t('help.subtitle')}</p>
          
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder={t('help.searchPlaceholder')} 
              className="pl-12 h-12 text-lg"
            />
          </div>
        </motion.div>

        {/* Help Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-semibold text-lg mb-4">{t('help.categories')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {helpCategories.map((category, index) => (
              <Card key={index} className="p-5 bg-card shadow-card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <category.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{category.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{category.articles} {t('help.articles')}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="data-card"
        >
          <h2 className="font-semibold text-lg mb-4">{t('help.faq')}</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-semibold text-lg mb-4">{t('help.contactSupport')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">{t('help.liveChat')}</h4>
                  <p className="text-xs text-muted-foreground">{t('help.responseTime')}</p>
                </div>
              </div>
              <Button className="w-full">{t('help.startChat')}</Button>
            </Card>
            
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-info" />
                </div>
                <div>
                  <h4 className="font-semibold">{t('help.emailSupport')}</h4>
                  <p className="text-xs text-muted-foreground">support@bluecore.vn</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">{t('help.sendEmail')}</Button>
            </Card>
            
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h4 className="font-semibold">{t('help.hotline')}</h4>
                  <p className="text-xs text-muted-foreground">1900-xxxx</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{t('help.workingHours')}</span>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </>
  );
}