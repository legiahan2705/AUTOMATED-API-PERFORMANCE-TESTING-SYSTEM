import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; 
import { CreateScheduledTestDto } from './dto/create-scheduled-test.dto';
import { UpdateScheduledTestDto } from './dto/update-scheduled-test.dto';
import { ScheduledTestsService } from './scheduled-test.service';

@Controller('scheduled-tests')
export class ScheduledTestsController {
  constructor(private readonly scheduledTestsService: ScheduledTestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateScheduledTestDto, @Req() req: any) {
    const scheduleData = {
      ...dto,
      userId: req.user.userId,  // luôn lấy từ JWT
    };

    return this.scheduledTestsService.create(scheduleData);
  }

  @Get()
  findAll() {
    return this.scheduledTestsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.scheduledTestsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() dto: UpdateScheduledTestDto) {
    return this.scheduledTestsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.scheduledTestsService.remove(id);
  }
}
